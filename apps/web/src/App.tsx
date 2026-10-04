import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Activity, ArrowDownRight, ArrowUpRight, BookOpenText, Check, ChevronDown, CircleHelp, Cpu, ExternalLink, FilePlus2, Layers3, LoaderCircle, LockKeyhole, Menu, MessageSquareText, Plus, Radio, Send, Settings2, ShieldCheck, Sparkles, Trash2, UsersRound, X } from 'lucide-react';
import { autoTitle, parseReviewOutput, safeHttpUrl, transitionStatus, type TaskStatus } from './core';
import { hasWebGPU, interruptLocalGeneration, loadLocalModel, MODEL_CARD_URL, MODEL_DISPLAY_NAME, MODEL_WEIGHT_BYTES, streamLocalCompletion, type MLCEngine } from './model';
import { clearLocalDatabase, createInitialState, isoNow, loadState, newId, saveState, type AgentProfile, type AuditEvent, type ChatMessage, type ClaimRecord, type Conversation, type LocalAppState, type SourceRecord, type Task } from './store';

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/reasona/`;
const visualAssets = [
  ['01_reasona_hero.png', 'Reasona 主視覺'], ['02_planner_avatar.png', 'Planner 角色示意'], ['03_researcher_avatar.png', 'Researcher 角色示意'], ['04_reviewer_avatar.png', 'Reviewer 角色示意'],
  ['05_agent_collaboration_ui.png', '代理協作概念'], ['06_source_citation_card.png', '來源引用卡概念'], ['07_task_status_flow.png', '任務狀態流程概念'], ['08_research_workspace_panel.png', '研究工作區概念'],
  ['09_knowledge_nodes.png', '知識節點概念'], ['10_review_view.png', '證據核對概念'], ['11_empty_state.png', '研究空狀態概念'], ['12_abstract_brand_background.png', '抽象品牌背景']
] as const;
const statusLabel: Record<TaskStatus, string> = { queued: '排隊中', running: '執行中', 'waiting for user': '等待使用者', completed: '已完成', failed: '失敗', cancelled: '已取消' };
const statusClass: Record<TaskStatus, string> = { queued: 'queued', running: 'running', 'waiting for user': 'waiting', completed: 'completed', failed: 'failed', cancelled: 'cancelled' };
const claimLabel = { source_fact: '來源直接支持 · 候選', synthesis: '跨來源綜合 · 候選', uncertainty: '不確定性／證據缺口' } as const;
const modelWeightMiB = Math.round(MODEL_WEIGHT_BYTES / (1024 * 1024));

type DeleteTarget = { kind: 'conversation'; id: string; label: string } | { kind: 'agent'; id: string; label: string } | { kind: 'all'; id: 'all'; label: string } | null;
type StreamingView = { taskId: string; role: 'Planner' | 'Researcher' | 'Reviewer'; body: string };

function audit(action: string, entityType: string, entityId: string): AuditEvent {
  return { id: newId(), action, entityType, entityId, at: isoNow() };
}
function displayDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function validWebUrl(value: string): boolean {
  return safeHttpUrl(value) !== null;
}

export function App() {
  const [data, setData] = useState<LocalAppState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('builtin-research-lead');
  const [prompt, setPrompt] = useState('');
  const [sourceDraft, setSourceDraft] = useState({ title: '', url: '', excerpt: '', locator: '' });
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [agentDraft, setAgentDraft] = useState<AgentProfile | null>(null);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [modelState, setModelState] = useState<'not-loaded' | 'loading' | 'ready' | 'error'>('not-loaded');
  const [modelProgress, setModelProgress] = useState({ text: '', progress: 0 });
  const [modelError, setModelError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [streaming, setStreaming] = useState<StreamingView | null>(null);
  const [runBusy, setRunBusy] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const engineRef = useRef<MLCEngine | null>(null);
  const cancelRequested = useRef(false);
  const persistQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let live = true;
    loadState().then(saved => {
      if (!live) return;
      if (saved) {
        const normalized = { ...createInitialState(), ...saved, auditEvents: saved.auditEvents || [] };
        setData(normalized);
        if (normalized.agents[0]) setSelectedAgentId(normalized.agents[0].id);
        const mostRecentConversation = [...normalized.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        setActiveConversationId(mostRecentConversation?.id || null);
      }
      setHydrated(true);
    }).catch(error => {
      if (live) { setStorageError(error instanceof Error ? error.message : '本機資料儲存不可用。'); setHydrated(true); }
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!hydrated || storageError) return;
    persistQueue.current = persistQueue.current.then(() => saveState(data)).catch(error => {
      setStorageError(error instanceof Error ? error.message : '保存本機資料失敗。');
    });
  }, [data, hydrated, storageError]);

  const mutate = useCallback((transform: (previous: LocalAppState) => LocalAppState) => {
    setData(previous => transform(previous));
  }, []);

  const conversations = useMemo(() => [...data.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [data.conversations]);
  const activeConversation = data.conversations.find(item => item.id === activeConversationId) || null;
  const activeAgent = data.agents.find(item => item.id === selectedAgentId) || data.agents[0] || null;
  const conversationTasks = useMemo(() => data.tasks.filter(item => item.conversationId === activeConversationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.tasks, activeConversationId]);
  const activeTask = data.tasks.find(item => item.id === activeTaskId && item.conversationId === activeConversationId) || conversationTasks[0] || null;
  const conversationSources = useMemo(() => data.sources.filter(item => item.conversationId === activeConversationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.sources, activeConversationId]);
  const taskMessages = useMemo(() => activeTask ? data.messages.filter(item => item.taskId === activeTask.id) : [], [data.messages, activeTask]);
  const taskClaims = useMemo(() => activeTask ? data.claims.filter(item => item.taskId === activeTask.id) : [], [data.claims, activeTask]);
  const taskSources = useMemo(() => activeTask ? data.sources.filter(item => activeTask.sourceIds.includes(item.id)) : [], [data.sources, activeTask]);

  useEffect(() => {
    if (activeTask && !data.tasks.some(item => item.id === activeTaskId && item.conversationId === activeConversationId)) setActiveTaskId(activeTask.id);
  }, [activeTask, activeTaskId, activeConversationId, data.tasks]);

  const createConversation = () => {
    const at = isoNow(); const id = newId();
    const item: Conversation = { id, title: '新研究對話', createdAt: at, updatedAt: at, titleEdited: false };
    mutate(previous => ({ ...previous, conversations: [item, ...previous.conversations], auditEvents: [...previous.auditEvents, audit('conversation.created', 'conversation', id)] }));
    setActiveConversationId(id); setActiveTaskId(null); setMobileNavOpen(false);
  };

  const setTaskPhase = (taskId: string, phase: string) => mutate(previous => ({
    ...previous,
    tasks: previous.tasks.map(item => item.id === taskId ? { ...item, phase, updatedAt: isoNow(), events: [...item.events, { id: newId(), status: item.status, phase, detail: `階段：${phase}`, createdAt: isoNow() }] } : item)
  }));

  const setTaskStatus = (taskId: string, next: TaskStatus, phase: string, blockedReason: string | null = null) => {
    mutate(previous => ({
      ...previous,
      tasks: previous.tasks.map(item => {
        if (item.id !== taskId) return item;
        const status = transitionStatus(item.status, next);
        const at = isoNow();
        return { ...item, status, phase, blockedReason, updatedAt: at, events: [...item.events, { id: newId(), status, phase, detail: blockedReason || `狀態：${statusLabel[status]}`, createdAt: at }] };
      }),
      auditEvents: [...previous.auditEvents, audit(`task.status.${next.replaceAll(' ', '_')}`, 'task', taskId)]
    }));
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'createdAt'>) => mutate(previous => ({
    ...previous,
    messages: [...previous.messages, { ...message, id: newId(), createdAt: isoNow() }]
  }));

  const generateRole = async (taskId: string, role: StreamingView['role'], system: string, user: string, jsonMode = false, maxTokens = 420) => {
    if (!engineRef.current) throw new Error('本機模型尚未載入。');
    setStreaming({ taskId, role, body: '' });
    const output = await streamLocalCompletion(engineRef.current, [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], delta => setStreaming(current => current?.taskId === taskId && current.role === role ? { ...current, body: current.body + delta } : current), jsonMode, maxTokens);
    setStreaming(null);
    return output;
  };

  const runPipeline = async (task: Task, sourceSnapshot: SourceRecord[]) => {
    if (!engineRef.current) { setOperationError('本機模型尚未就緒；沒有送出任何 AI 請求。'); return; }
    cancelRequested.current = false; setRunBusy(true); setOperationError('');
    try {
      setTaskStatus(task.id, 'running', 'Planner · 任務拆解');
      const evidenceText = sourceSnapshot.length ? sourceSnapshot.map(source => `[evidenceId=${source.evidenceId}]\n標題（使用者提供）：${source.title}\nURL（使用者提供）：${source.url}\n定位（使用者提供）：${source.locator || '未提供'}\n原文片段（使用者提供）：\n${source.excerpt}`).join('\n\n---\n\n') : '目前沒有使用者提供的來源片段。不得提出來源事實或編造引用。';
      const planner = await generateRole(task.id, 'Planner', `${task.agentSnapshot.instructions}\n你是 Planner，只拆解研究問題，不做網路搜尋、不引用外部事實、不宣稱已查證。`, `研究問題：\n${task.prompt}\n\n請以繁體中文列出不超過 4 個研究子問題和可能的證據需求。這只是規劃建議，不是研究事實。`, false, 260);
      if (cancelRequested.current) return;
      addMessage({ conversationId: task.conversationId, taskId: task.id, speaker: 'agent', role: 'Planner', body: planner || 'Planner 沒有回傳文字。' });

      setTaskPhase(task.id, 'Researcher · 檢視使用者貼上的來源片段');
      const researcher = await generateRole(task.id, 'Researcher', `${task.agentSnapshot.instructions}\n你是 Researcher。你不能瀏覽網頁、搜尋網路或呼叫工具。只可閱讀下列使用者提供的原文片段；將觀察標為候選，不要補造來源、作者或日期。`, `研究問題：\n${task.prompt}\n\nPlanner 的子問題（未驗證）：\n${planner}\n\n可用來源片段：\n${evidenceText}\n\n請簡潔說明可用證據與缺口；每個觀察只提及給定的 evidenceId。若沒有來源，直接說明無法提出事實主張。`, false, 360);
      if (cancelRequested.current) return;
      addMessage({ conversationId: task.conversationId, taskId: task.id, speaker: 'agent', role: 'Researcher', body: researcher || 'Researcher 沒有回傳文字。' });

      setTaskPhase(task.id, 'Reviewer · 驗證 evidence ID 並整理候選主張');
      const allowed = sourceSnapshot.map(source => source.evidenceId);
      const reviewer = await generateRole(task.id, 'Reviewer', `你是 Reviewer。不得搜尋網路。你只能根據輸入中的使用者原文片段提出「候選」主張。絕不可創造作者、日期、引文、URL 或 evidence ID。若證據不足，把資訊放入 gaps；若來源互相矛盾，把差異放入 conflicts。source_fact 和 synthesis 每項都必須引用至少一個原文提供的 evidenceId。沒有證據時只可回傳 uncertainty 類別或空 claims。所有內容尚未經人工語義核對。`, `只能輸出一個符合下列 JSON schema 的 JSON object，不要使用 markdown fence：{"claims":[{"kind":"source_fact|synthesis|uncertainty","text":"候選主張","evidenceIds":["只可使用已列出的 evidenceId"],"note":"限制或核對事項"}],"gaps":["待補證據／問題"],"conflicts":["可能衝突；需人工核對"]}\n\n研究問題：\n${task.prompt}\n\n已允許的 evidenceId：${JSON.stringify(allowed)}\n\n來源片段：\n${evidenceText}\n\nResearcher 的候選觀察（未驗證）：\n${researcher}\n\n注意：可用 ID 為空時，claims 不可含 source_fact 或 synthesis。`, true, 560);
      if (cancelRequested.current) return;
      addMessage({ conversationId: task.conversationId, taskId: task.id, speaker: 'agent', role: 'Reviewer', body: reviewer || 'Reviewer 沒有回傳文字。' });

      let review;
      try { review = parseReviewOutput(reviewer, new Set(allowed)); }
      catch (error) {
        const reason = error instanceof Error ? error.message : '輸出需要人工檢查。';
        setTaskStatus(task.id, 'waiting for user', 'Reviewer 輸出待人工處理', reason);
        return;
      }
      const records: ClaimRecord[] = review.claims.map(item => ({ id: newId(), taskId: task.id, kind: item.kind, text: item.text, evidenceIds: item.evidenceIds, note: item.note, reviewedAt: null }));
      mutate(previous => ({ ...previous, claims: [...previous.claims, ...records], tasks: previous.tasks.map(item => item.id === task.id ? { ...item, gaps: review.gaps, conflicts: review.conflicts } : item) }));
      setTaskStatus(task.id, 'waiting for user', '候選短報告待人工核對', '模型草稿尚未經語義核查；請逐項開啟來源原文並核對。若沒有主張，請先補上來源片段或調整問題。');
    } catch (error) {
      setStreaming(null);
      if (!cancelRequested.current) {
        const reason = error instanceof Error ? error.message : '本機推理失敗。';
        setOperationError(reason);
        try { setTaskStatus(task.id, 'failed', '本機推理失敗', reason); } catch { /* task may already be cancelled */ }
      }
    } finally {
      setStreaming(null); setRunBusy(false);
    }
  };

  const loadModel = async () => {
    if (!hasWebGPU()) { setModelState('error'); setModelError('此瀏覽器無 WebGPU。Reasona 不會改用付費 API 或遠端模型。'); return; }
    setModelState('loading'); setModelError(''); setModelProgress({ text: '等待 WebGPU 模型載入回報…', progress: 0 });
    try {
      engineRef.current = await loadLocalModel((text, progress) => setModelProgress({ text, progress }));
      setModelState('ready'); setModelProgress({ text: '模型載入完成，推理在此瀏覽器本機執行。', progress: 1 });
    } catch (error) {
      engineRef.current = null; setModelState('error'); setModelError(error instanceof Error ? error.message : '載入本機模型失敗。');
    }
  };

  const submitTask = async (event: FormEvent) => {
    event.preventDefault();
    const question = prompt.trim();
    if (question.length < 8 || !activeAgent || modelState !== 'ready' || storageError) return;
    if (!engineRef.current) { setOperationError('本機模型 engine 尚未就緒；任務未建立。請重新載入模型。'); return; }
    let conversation = activeConversation;
    if (!conversation) {
      const at = isoNow();
      conversation = { id: newId(), title: autoTitle(question), createdAt: at, updatedAt: at, titleEdited: false };
      mutate(previous => ({ ...previous, conversations: [conversation!, ...previous.conversations], auditEvents: [...previous.auditEvents, audit('conversation.created', 'conversation', conversation!.id)] }));
      setActiveConversationId(conversation.id);
    } else if (!conversation.titleEdited && conversation.title === '新研究對話') {
      conversation = { ...conversation, title: autoTitle(question), updatedAt: isoNow() };
      mutate(previous => ({ ...previous, conversations: previous.conversations.map(item => item.id === conversation!.id ? conversation! : item) }));
    }
    const at = isoNow(); const id = newId();
    const sourceSnapshot = data.sources.filter(item => item.conversationId === conversation!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
    const task: Task = {
      id, conversationId: conversation.id, title: autoTitle(question), prompt: question, status: 'queued', phase: 'queued', blockedReason: null,
      agentSnapshot: { id: activeAgent.id, name: activeAgent.name, role: activeAgent.role, instructions: activeAgent.instructions },
      sourceIds: sourceSnapshot.map(item => item.id), events: [{ id: newId(), status: 'queued', phase: 'queued', detail: '任務已建立，尚未執行。', createdAt: at }],
      gaps: [], conflicts: [], createdAt: at, updatedAt: at
    };
    mutate(previous => ({
      ...previous,
      tasks: [task, ...previous.tasks],
      messages: [...previous.messages, { id: newId(), conversationId: conversation!.id, taskId: id, speaker: 'user', role: '使用者', body: question, createdAt: at }],
      auditEvents: [...previous.auditEvents, audit('task.created', 'task', id)]
    }));
    setActiveTaskId(id); setPrompt('');
    await runPipeline(task, sourceSnapshot);
  };

  const addSource = (event: FormEvent) => {
    event.preventDefault();
    if (!activeConversation || !sourceDraft.title.trim() || !validWebUrl(sourceDraft.url.trim()) || !sourceDraft.excerpt.trim()) {
      setOperationError('請提供標題、有效的 HTTP(S) URL 與你已閱讀的原文片段。'); return;
    }
    const source: SourceRecord = { id: newId(), evidenceId: `ev-${newId()}`, conversationId: activeConversation.id, title: sourceDraft.title.trim(), url: sourceDraft.url.trim(), excerpt: sourceDraft.excerpt.trim(), locator: sourceDraft.locator.trim(), createdAt: isoNow() };
    mutate(previous => ({ ...previous, sources: [...previous.sources, source], auditEvents: [...previous.auditEvents, audit('source.added', 'source', source.id)] }));
    setSourceDraft({ title: '', url: '', excerpt: '', locator: '' }); setShowSourceForm(false); setOperationError('');
  };

  const saveAgent = (event: FormEvent) => {
    event.preventDefault();
    if (!agentDraft?.name.trim() || !agentDraft.role.trim() || !agentDraft.instructions.trim()) return;
    const at = isoNow(); const editing = data.agents.some(item => item.id === agentDraft.id);
    const next = { ...agentDraft, name: agentDraft.name.trim(), role: agentDraft.role.trim(), instructions: agentDraft.instructions.trim(), updatedAt: at };
    mutate(previous => ({
      ...previous,
      agents: editing ? previous.agents.map(item => item.id === next.id ? next : item) : [...previous.agents, { ...next, createdAt: at }],
      auditEvents: [...previous.auditEvents, audit(editing ? 'agent.updated' : 'agent.created', 'agent', next.id)]
    }));
    setSelectedAgentId(next.id); setAgentDraft(null); setShowAgentForm(false);
  };

  const newAgent = () => {
    const at = isoNow();
    setAgentDraft({ id: newId(), name: '', role: '', instructions: '', createdAt: at, updatedAt: at }); setShowAgentForm(true);
  };

  const deleteConfirmed = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    if ((target.kind === 'all' || (target.kind === 'conversation' && activeConversationId === target.id && activeTask?.status === 'running')) && runBusy) {
      cancelRequested.current = true;
      try { await interruptLocalGeneration(); } catch { /* stop the active local generation before deleting its data */ }
      setStreaming(null);
    }
    if (target.kind === 'all') {
      try { await persistQueue.current; await clearLocalDatabase(); } catch (error) { setOperationError(error instanceof Error ? error.message : '刪除失敗。'); return; }
      setData(createInitialState()); setActiveConversationId(null); setActiveTaskId(null); setSelectedAgentId('builtin-research-lead');
    } else if (target.kind === 'conversation') {
      mutate(previous => ({
        ...previous,
        conversations: previous.conversations.filter(item => item.id !== target.id),
        tasks: previous.tasks.filter(item => item.conversationId !== target.id),
        sources: previous.sources.filter(item => item.conversationId !== target.id),
        messages: previous.messages.filter(item => item.conversationId !== target.id),
        claims: previous.claims.filter(claim => !previous.tasks.some(task => task.id === claim.taskId && task.conversationId === target.id)),
        auditEvents: [...previous.auditEvents, audit('conversation.deleted', 'conversation', target.id)]
      }));
      if (activeConversationId === target.id) { setActiveConversationId(null); setActiveTaskId(null); }
    } else {
      if (target.id === 'builtin-research-lead') { setOperationError('內建範本不能刪除；可編輯或新增個人 Agent。'); setDeleteTarget(null); return; }
      mutate(previous => ({ ...previous, agents: previous.agents.filter(item => item.id !== target.id), auditEvents: [...previous.auditEvents, audit('agent.deleted', 'agent', target.id)] }));
      if (selectedAgentId === target.id) setSelectedAgentId('builtin-research-lead');
    }
    setDeleteTarget(null);
  };

  const cancelRun = async () => {
    if (!activeTask || activeTask.status !== 'running') return;
    cancelRequested.current = true;
    try { await interruptLocalGeneration(); } catch { /* stop is best-effort; no new role will be started */ }
    try { setTaskStatus(activeTask.id, 'cancelled', '已取消', '使用者取消本機生成；已停止後續代理步驟。'); } catch { /* state may already be terminal */ }
    setStreaming(null);
  };

  const reviewClaim = (claim: ClaimRecord) => {
    if (!activeTask || activeTask.status !== 'waiting for user') return;
    const reviewedAt = isoNow();
    mutate(previous => ({ ...previous, claims: previous.claims.map(item => item.id === claim.id ? { ...item, reviewedAt } : item), auditEvents: [...previous.auditEvents, audit('claim.reviewed', 'claim', claim.id)] }));
    const outstanding = taskClaims.filter(item => item.id !== claim.id && !item.reviewedAt);
    if (outstanding.length === 0) {
      setTaskStatus(activeTask.id, 'completed', '人工核對完成', '所有候選主張均已由使用者標記核對；此標記不構成 Reasona 的自動驗證。');
    }
  };

  const retryTask = (task: Task) => {
    setPrompt(task.prompt);
    document.getElementById('research-prompt')?.focus();
  };

  const currentStreaming = streaming?.taskId === activeTask?.id ? streaming : null;
  const modelStatusText = modelState === 'ready' ? '本機模型已載入' : modelState === 'loading' ? '載入模型中' : modelState === 'error' ? '模型無法使用' : '尚未載入模型';

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button mobile-menu" type="button" onClick={() => setMobileNavOpen(value => !value)} aria-label="切換側邊導覽"><Menu size={18} /></button>
        <a className="wordmark" href="#workspace" aria-label="Reasona 研究工作台首頁"><span className="brand-mark">R</span><span>REASONA</span><small>LOCAL RESEARCH STUDIO</small></a>
        <div className="topbar-center"><span className="mode-dot" /> 靜態網站 · 瀏覽器本機模式 <span className="topbar-divider" /> 無後端／無同步</div>
        <button className="icon-button" type="button" title="資料與權限" onClick={() => document.getElementById('privacy-panel')?.scrollIntoView({ behavior: 'smooth' })}><ShieldCheck size={18} /></button>
      </header>

      <div className={`workspace-grid ${mobileNavOpen ? 'nav-open' : ''}`} id="workspace">
        <aside className="sidebar" aria-label="對話與 Agent 導覽">
          <div className="sidebar-heading"><span>工作區</span><span className="local-pill">只在本機</span></div>
          <button className="new-conversation" type="button" onClick={createConversation}><Plus size={16} /> 新研究對話</button>
          <div className="side-section-label"><span>對話</span><span>{conversations.length}</span></div>
          <nav className="conversation-list" aria-label="對話清單">
            {conversations.length === 0 ? <p className="sidebar-empty">尚無對話。提出第一個研究問題即可建立。</p> : conversations.map(item => (
              <div key={item.id} className="conversation-row">
                <button type="button" className={`conversation-item ${activeConversationId === item.id ? 'selected' : ''}`} onClick={() => { setActiveConversationId(item.id); setActiveTaskId(null); setMobileNavOpen(false); }}><MessageSquareText size={15} /><span>{item.title}</span></button>
                <button className="row-delete" type="button" aria-label={`刪除 ${item.title}`} onClick={() => setDeleteTarget({ kind: 'conversation', id: item.id, label: item.title })}><Trash2 size={14} /></button>
              </div>
            ))}
          </nav>

          <div className="side-section-label agent-heading"><span>個人 Agent</span><button type="button" className="tiny-icon" title="新增 Agent" onClick={newAgent}><Plus size={15} /></button></div>
          <div className="agent-list">
            {data.agents.map(agent => <div key={agent.id} className={`agent-row ${selectedAgentId === agent.id ? 'selected' : ''}`}>
              <button type="button" className="agent-select" onClick={() => setSelectedAgentId(agent.id)}><span className="avatar-mini"><img src={`${ASSET_BASE}${agent.role.toLowerCase().includes('研究') ? '03_researcher_avatar.png' : '02_planner_avatar.png'}`} alt="" /></span><span><b>{agent.name}</b><small>{agent.role}</small></span></button>
              <button type="button" className="tiny-icon" aria-label={`編輯 ${agent.name}`} onClick={() => { setAgentDraft(agent); setShowAgentForm(true); }}><Settings2 size={14} /></button>
            </div>)}
          </div>
          <div className="sidebar-footer">
            <div className="user-local"><span className="user-icon"><LockKeyhole size={15} /></span><span><b>本機使用者</b><small>無帳戶、無雲端同步</small></span></div>
            <button className="text-button danger-text" type="button" onClick={() => setDeleteTarget({ kind: 'all', id: 'all', label: 'Reasona 工作區資料' })}><Trash2 size={14} /> 清除 Reasona 工作區資料</button>
          </div>
        </aside>

        <main className="main-column">
          <section className="main-heading">
            <div className="eyebrow"><span className="eyebrow-line" /> 來源可追溯研究工作台</div>
            <h1>{activeTask?.title || activeConversation?.title || '把問題拆清楚，再沿著證據前進。'}</h1>
            <p>使用者提供來源片段 · 本機 Qwen 推理 · 每項候選主張連結回 evidence</p>
          </section>

          <section className="readiness-strip" aria-label="模型與服務狀態">
            <div className={`readiness-icon ${modelState}`}><Cpu size={17} /></div>
            <div className="readiness-copy"><strong>{modelStatusText}</strong><span>{modelState === 'ready' ? `${MODEL_DISPLAY_NAME} · 輸入留在此瀏覽器` : `首次載入約 ${modelWeightMiB} MiB 模型權重，需 WebGPU；不會使用 API key 或付費服務。`}</span></div>
            {modelState === 'ready' ? <span className="ready-chip"><Check size={13} /> 本機推理</span> : <button className="button button-light" type="button" disabled={modelState === 'loading'} onClick={() => void loadModel()}>{modelState === 'loading' ? <><LoaderCircle className="spin" size={15} /> 載入中</> : <><Cpu size={15} /> 載入本機模型</>}</button>}
            {modelState === 'loading' && <div className="model-progress" aria-live="polite"><span>{modelProgress.text}</span><progress max={1} value={modelProgress.progress} aria-label="模型載入實際進度" /></div>}
            {modelError && <div className="inline-error" role="alert">{modelError}</div>}
          </section>

          {!hasWebGPU() && <div className="notice notice-warn"><CircleHelp size={17} /><span>此裝置未回報 WebGPU。此網站不會切換到遠端模型；可檢視工作台，但需支援 WebGPU 的瀏覽器才能執行本機推理。</span></div>}
          {storageError && <div className="notice notice-error" role="alert"><CircleHelp size={17} /><span>本機資料儲存不可用：{storageError}</span></div>}
          {operationError && <div className="notice notice-error" role="alert"><CircleHelp size={17} /><span>{operationError}</span><button type="button" className="tiny-icon" onClick={() => setOperationError('')} aria-label="關閉訊息"><X size={15} /></button></div>}

          <div className="task-overview">
            <div className="task-title-row"><div><div className="eyebrow muted">目前對話</div><h2>{activeConversation?.title || '尚未建立對話'}</h2></div>{activeTask && <div className={`status-badge ${statusClass[activeTask.status]}`}><span />{statusLabel[activeTask.status]}</div>}</div>
            {activeTask ? <div className="task-meta"><span><Activity size={14} /> 階段：{activeTask.phase}</span><span><UsersRound size={14} /> {activeTask.agentSnapshot.name} · 單一模型的角色視角</span><span>更新：{displayDate(activeTask.updatedAt)}</span>{(activeTask.status === 'failed' || activeTask.status === 'cancelled' || (activeTask.status === 'waiting for user' && taskClaims.length === 0)) && <button className="text-button" type="button" onClick={() => retryTask(activeTask)}><Send size={13} /> 載入原問題以建立新任務</button>}</div> : <p className="muted-text">建立對話並提出問題；任務會從真實模型呼叫更新狀態，不顯示虛構百分比。</p>}
          </div>

          {conversationTasks.length > 0 && <div className="task-tabs" role="tablist" aria-label="此對話的研究任務">{conversationTasks.slice(0, 5).map(task => <button key={task.id} type="button" role="tab" aria-selected={activeTask?.id === task.id} className={activeTask?.id === task.id ? 'active' : ''} onClick={() => setActiveTaskId(task.id)}><span className={`tab-dot ${statusClass[task.status]}`} />{task.title}</button>)}</div>}

          {showAgentForm && agentDraft && <section className="editor-card" aria-label="Agent 編輯器"><div className="section-header"><div><div className="eyebrow muted">個人 Agent 設定</div><h3>{data.agents.some(item => item.id === agentDraft.id) ? '編輯 Agent' : '新增 Agent'}</h3></div><button className="icon-button" type="button" aria-label="關閉 Agent 編輯器" onClick={() => { setShowAgentForm(false); setAgentDraft(null); }}><X size={17} /></button></div><form className="stack-form" onSubmit={saveAgent}><label>名稱<input required maxLength={80} value={agentDraft.name} onChange={event => setAgentDraft({ ...agentDraft, name: event.target.value })} /></label><label>角色<input required maxLength={120} value={agentDraft.role} onChange={event => setAgentDraft({ ...agentDraft, role: event.target.value })} /></label><label>工作指示<textarea required rows={4} maxLength={3000} value={agentDraft.instructions} onChange={event => setAgentDraft({ ...agentDraft, instructions: event.target.value })} /></label><div className="form-actions"><button className="button button-light" type="submit"><Check size={15} /> 儲存版本</button>{agentDraft.id !== 'builtin-research-lead' && data.agents.some(item => item.id === agentDraft.id) && <button className="text-button danger-text" type="button" onClick={() => setDeleteTarget({ kind: 'agent', id: agentDraft.id, label: agentDraft.name })}><Trash2 size={14} /> 刪除 Agent</button>}</div></form></section>}

          {showSourceForm && <section className="editor-card" aria-label="來源片段登錄"><div className="section-header"><div><div className="eyebrow muted">人工提供來源</div><h3>登錄一段已閱讀的來源</h3></div><button className="icon-button" type="button" aria-label="關閉來源表單" onClick={() => setShowSourceForm(false)}><X size={17} /></button></div><p className="muted-text">目前不會自動搜尋或抓取網址。請貼上原文片段；URL、標題與定位都由你提供。每段最多 900 字；每個任務最多帶入最近的 5 段，適配小模型 context。</p><form className="stack-form" onSubmit={addSource}><label>來源標題<input required maxLength={240} value={sourceDraft.title} onChange={event => setSourceDraft({ ...sourceDraft, title: event.target.value })} /></label><label>HTTP(S) URL<input required type="url" placeholder="https://…" value={sourceDraft.url} onChange={event => setSourceDraft({ ...sourceDraft, url: event.target.value })} /></label><label>原文片段<textarea required rows={5} maxLength={900} value={sourceDraft.excerpt} onChange={event => setSourceDraft({ ...sourceDraft, excerpt: event.target.value })} /></label><label>段落／頁碼定位（可留空）<input maxLength={200} value={sourceDraft.locator} onChange={event => setSourceDraft({ ...sourceDraft, locator: event.target.value })} /></label><div className="form-actions"><button className="button button-light" type="submit"><FilePlus2 size={15} /> 儲存來源片段</button><span className="micro-copy">只存入此瀏覽器與目前對話；既有任務來源快照不變</span></div></form></section>}

          {!activeTask && !showAgentForm && !showSourceForm && <section className="empty-state"><img src={`${ASSET_BASE}11_empty_state.png`} alt="黑白灰研究節點概念圖" /><div className="empty-copy"><span className="eyebrow muted">從一個可回答的問題開始</span><h2>先建立清楚問題，再決定需要哪些證據。</h2><p>這裡不會預先塞入示範研究、引用或代理回報。你新增的資料只存在目前瀏覽器。</p><button className="button button-light" type="button" onClick={createConversation}><Plus size={16} /> 建立第一個對話</button></div></section>}

          {activeTask && <>
            <section className="group-chat" aria-label="任務代理群聊"><div className="section-header"><div><div className="eyebrow muted">任務群聊 · 實際推理紀錄</div><h3>角色分工與訊息順序</h3></div><span className="single-model-note"><Radio size={13} /> 同一個本機模型 · 依序生成</span></div><div className="roles-row"><div><img src={`${ASSET_BASE}02_planner_avatar.png`} alt="" /><span>Planner<small>拆解問題</small></span></div><ArrowDownRight size={15} /><div><img src={`${ASSET_BASE}03_researcher_avatar.png`} alt="" /><span>Researcher<small>讀取貼上的片段</small></span></div><ArrowDownRight size={15} /><div><img src={`${ASSET_BASE}04_reviewer_avatar.png`} alt="" /><span>Reviewer<small>檢查 ID／整理候選</small></span></div></div><div className="message-list" aria-live="polite">
              {taskMessages.map(message => <article key={message.id} className={`message-card ${message.speaker}`}><div className="message-avatar">{message.speaker === 'user' ? '你' : <img src={`${ASSET_BASE}${message.role === 'Planner' ? '02_planner_avatar.png' : message.role === 'Researcher' ? '03_researcher_avatar.png' : '04_reviewer_avatar.png'}`} alt="" />}</div><div className="message-content"><div className="message-meta"><strong>{message.role === '使用者' ? '使用者' : `${message.role} · ${activeTask.agentSnapshot.name}`}</strong><time>{displayDate(message.createdAt)}</time></div><p>{message.body}</p>{message.speaker === 'agent' && <small className="unverified-note">模型生成 · 未經語義驗證</small>}</div></article>)}
              {currentStreaming && <article className="message-card agent streaming-card"><div className="message-avatar"><img src={`${ASSET_BASE}${currentStreaming.role === 'Planner' ? '02_planner_avatar.png' : currentStreaming.role === 'Researcher' ? '03_researcher_avatar.png' : '04_reviewer_avatar.png'}`} alt="" /></div><div className="message-content"><div className="message-meta"><strong>{currentStreaming.role} · 正在本機生成</strong><LoaderCircle size={14} className="spin" /></div><p>{currentStreaming.body || '模型已開始生成，等待第一個 token…'}</p></div></article>}
              {taskMessages.length === 0 && !currentStreaming && <div className="quiet-empty">尚無群聊訊息；尚未執行模型。</div>}
            </div></section>

            <section className="report-section"><div className="section-header"><div><div className="eyebrow muted">研究短報告草稿</div><h3>候選主張與來源追溯</h3></div><span className="unverified-chip"><ShieldCheck size={13} /> 人工核對前均未驗證</span></div>
              {activeTask.blockedReason && <div className="notice notice-warn compact"><CircleHelp size={16} /><span>{activeTask.blockedReason}</span></div>}
              {taskClaims.length === 0 ? <div className="quiet-empty">目前沒有可展示的候選主張。{activeTask.status === 'waiting for user' ? '請新增來源片段或調整問題後重跑。' : '來源或模型輸出尚未完成。'}</div> : taskClaims.map(claim => <article key={claim.id} className="claim-card"><div className="claim-label"><span>{claimLabel[claim.kind]}</span><span className={claim.reviewedAt ? 'verified-chip' : 'unverified-chip'}>{claim.reviewedAt ? '已由使用者標記核對' : '待人工核對'}</span></div><p>{claim.text}</p>{claim.note && <p className="claim-note">核對提醒：{claim.note}</p>}<div className="evidence-links">{claim.evidenceIds.map(id => { const source = data.sources.find(item => item.evidenceId === id); const href = source ? safeHttpUrl(source.url) : null; return source && href ? <a key={id} href={href} target="_blank" rel="noreferrer"><ExternalLink size={13} />{source.title}<span>{source.locator || '使用者貼上片段'}</span></a> : <span key={id} className="error-text">{source ? `來源 URL 不安全或無效：${id}` : `缺少來源記錄：${id}`}</span>; })}</div>{!claim.reviewedAt && activeTask.status === 'waiting for user' && <button className="text-button review-action" type="button" onClick={() => reviewClaim(claim)}><Check size={14} /> 我已開啟原文並核對此主張</button>}</article>)}
              {(activeTask.gaps.length > 0 || activeTask.conflicts.length > 0) && <div className="gap-grid">{activeTask.gaps.length > 0 && <div className="gap-card"><strong>模型提出的證據缺口 · 待核實</strong>{activeTask.gaps.map((item, i) => <p key={i}>{item}</p>)}</div>}{activeTask.conflicts.length > 0 && <div className="gap-card"><strong>模型指出的可能衝突 · 待核實</strong>{activeTask.conflicts.map((item, i) => <p key={i}>{item}</p>)}</div>}</div>}
            </section>

            <section className="sources-section"><div className="section-header"><div><div className="eyebrow muted">來源記錄</div><h3>本任務使用的使用者來源</h3></div><button className="text-button" type="button" onClick={() => setShowSourceForm(true)}><Plus size={14} /> 新增來源</button></div>{taskSources.length === 0 ? <div className="quiet-empty">本任務建立時沒有可用來源；模型不得用外部知識補成來源事實。</div> : taskSources.map(source => <article key={source.id} className="source-card"><div className="source-icon"><BookOpenText size={17} /></div><div className="source-info">{safeHttpUrl(source.url) ? <a href={safeHttpUrl(source.url)!} target="_blank" rel="noreferrer">{source.title} <ExternalLink size={12} /></a> : <span className="error-text">來源 URL 不安全或無效</span>}<small>{source.url} {source.locator && `· ${source.locator}`}</small><p>{source.excerpt}</p></div></article>)}</section>

            <details className="audit-details"><summary><Activity size={15} /> 任務狀態事件與稽核紀錄 <ChevronDown size={15} /></summary><ol>{activeTask.events.map(item => <li key={item.id}><time>{displayDate(item.createdAt)}</time><b>{statusLabel[item.status]}</b><span>{item.phase}</span><small>{item.detail}</small></li>)}{data.auditEvents.filter(item => item.entityId === activeTask.id).map(item => <li key={item.id}><time>{displayDate(item.at)}</time><b>audit</b><span>{item.action}</span></li>)}</ol></details>
          </>}

          <section className="composer-panel"><div className="composer-topline"><div><strong>研究問題</strong><span>適合拆成可由來源片段支持的短報告</span></div><label className="agent-picker"><span>使用 Agent</span><select value={activeAgent?.id || ''} onChange={event => setSelectedAgentId(event.target.value)}>{data.agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>)}</select></label></div><div className="source-count-row"><span><BookOpenText size={14} /> 此對話已登錄 {conversationSources.length} 段來源片段</span><button type="button" className="text-button" disabled={!activeConversation} title={!activeConversation ? '請先建立對話' : '貼上來源片段'} onClick={() => setShowSourceForm(value => !value)}><FilePlus2 size={14} /> {showSourceForm ? '關閉來源表單' : '貼上來源'}</button></div><form className="composer-form" onSubmit={event => void submitTask(event)}><textarea id="research-prompt" rows={3} maxLength={2000} placeholder="例如：比較兩份來源對研究限制的描述，指出直接支持的事實、差異與尚缺證據。" value={prompt} onChange={event => setPrompt(event.target.value)} disabled={modelState !== 'ready' || runBusy} aria-label="輸入研究問題" /><div className="composer-actions"><span className="micro-copy">{prompt.length}/2000 · 本機推理，不會自動搜尋網路</span><div>{activeTask?.status === 'running' && <button type="button" className="button button-quiet" onClick={() => void cancelRun()}><X size={14} /> 取消</button>}<button type="submit" className="button button-dark" disabled={modelState !== 'ready' || runBusy || prompt.trim().length < 8}><Send size={15} />{runBusy ? '本機角色流程進行中' : '以本機模型開始'}</button></div></div></form><div className="composer-footnote"><LockKeyhole size={13} /> 未載入模型前不能執行。三個角色由同一個模型依序生成，不是獨立代理服務。</div></section>
        </main>

        <aside className="right-rail" aria-label="研究設定與狀態"><section className="rail-card model-card"><div className="rail-kicker"><Cpu size={14} /> LOCAL MODEL</div><h3>{MODEL_DISPLAY_NAME}</h3><p>WebLLM · WebGPU · 4k context config</p><div className="model-spec"><span>模型權重</span><b>約 {modelWeightMiB} MiB</b><span>目標 VRAM</span><b>約 1.4 GiB</b><span>授權提示</span><b>需核對衍生權重</b></div><a className="rail-link" href={MODEL_CARD_URL} target="_blank" rel="noreferrer">Qwen3 base model card <ArrowUpRight size={14} /></a><p className="small-warning">Base model 標示 Apache-2.0；MLC 量化 repo 沒有獨立 license 欄位。本程式不重散布權重，正式用途前請先做授權審查。小模型品質未驗證。</p></section>
          <section className="rail-card"><div className="rail-kicker"><Layers3 size={14} /> EXECUTION BOUNDARY</div><h3>目前沒有外部工具權限</h3><div className="tool-state"><span className="off-dot" /> Web 搜尋／網址擷取 <b>未接通</b></div><div className="tool-state"><span className="off-dot" /> Browser／shell／程式執行 <b>未安裝／停用</b></div><div className="tool-state"><span className="off-dot" /> MCP／第三方外掛 <b>未連接</b></div><div className="tool-state"><span className="off-dot" /> 發送／發布／付款 <b>無執行器</b></div><p className="rail-footnote">任何未來外部工具都須隔離、逐項白名單與明確授權；本頁不能代替權限閘道。</p></section>
          <section className="rail-card"><div className="rail-kicker"><ShieldCheck size={14} /> APPROVAL GATE</div><h3>高影響操作核准</h3><div className="quiet-empty">未連接外部工具執行器；本機預覽沒有待核准或可執行操作。這不代表未來外部動作已獲授權。</div></section>
          <section className="rail-card schedule-card"><div className="rail-kicker"><Activity size={14} /> SCHEDULES</div><h3>排程</h3><div className="schedule-head"><span>名稱</span><span>下次執行</span><span>上次結果</span></div><p className="quiet-empty">沒有已設定排程。此靜態網站沒有 scheduler/worker。</p></section>
          <section className="rail-card privacy-card" id="privacy-panel"><div className="rail-kicker"><ShieldCheck size={14} /> PRIVACY</div><h3>資料留在此瀏覽器</h3><ul><li>IndexedDB 保存 Reasona 工作區資料</li><li>不登入、不雲端同步</li><li>提示與來源不傳至模型 API</li><li>模型權重從 Hugging Face 請求並可能留在瀏覽器 Cache API</li><li>清除工作區不會清掉模型快取；請在瀏覽器網站資料設定另行清除</li><li>分享／匯出未啟用</li></ul><div className="privacy-actions"><span>Google OAuth 尚未設定</span><span>API／SQLite 未部署到 Pages</span></div></section>
          <details className="rail-card visual-reference"><summary><span className="rail-kicker"><Sparkles size={14} /> PROVIDED VISUALS</span><span>12 張附件 PNG <ChevronDown size={14} /></span></summary><p>這些是使用者提供的設計概念素材，不表示即時代理活動或產品功能。</p><div className="visual-grid">{visualAssets.map(([file, label]) => <figure key={file}><img src={`${ASSET_BASE}${file}`} alt={label} loading="lazy" /><figcaption>{label}</figcaption></figure>)}</div></details>
        </aside>
      </div>

      <footer className="app-footer"><span>REASONA · LOCAL RESEARCH STUDIO</span><span>GitHub Pages 僅提供靜態前端；沒有伺服器 API、登入、排程或研究搜尋。</span></footer>

      <AlertDialog.Root open={Boolean(deleteTarget)} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay" /><AlertDialog.Content className="confirm-dialog"><div className="dialog-icon"><Trash2 size={19} /></div><AlertDialog.Title className="dialog-title">{deleteTarget?.kind === 'all' ? '確認清除 Reasona 工作區資料' : deleteTarget?.kind === 'agent' ? '確認刪除個人 Agent' : '確認刪除對話'}</AlertDialog.Title><AlertDialog.Description asChild><p className="dialog-description">{deleteTarget?.kind === 'all' ? '將永久刪除此瀏覽器 IndexedDB 中的 Reasona 對話、任務、來源片段、證據、主張、Agent 設定與稽核記錄。WebLLM 模型權重若已存入瀏覽器 Cache API，不會由此操作刪除；請到瀏覽器網站資料設定另行清除。此動作無法復原。' : deleteTarget?.kind === 'agent' ? `將刪除 Agent「${deleteTarget.label}」設定；既有任務中的 Agent 快照會保留。此動作無法復原。` : `將刪除「${deleteTarget?.label}」及其所有任務、群聊訊息、來源片段與 claims；此本機工作區不保存核准 payload。對話刪除稽核 metadata 會保留。此動作無法復原。`}</p></AlertDialog.Description><div className="dialog-actions"><AlertDialog.Cancel asChild><button className="button button-quiet" type="button">保留</button></AlertDialog.Cancel><AlertDialog.Action asChild><button className="button button-danger" type="button" onClick={() => void deleteConfirmed()}>確認刪除</button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
