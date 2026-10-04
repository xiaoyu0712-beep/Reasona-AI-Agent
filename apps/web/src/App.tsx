import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, Archive, ArrowDown, ArrowUpRight, Bot, Check, ChevronDown, CircleHelp, Clock3, FilePlus2, Layers3, LoaderCircle, LogOut, Menu, MessageSquareText, PanelLeftClose, Plus, Radio, RefreshCw, Search, Send, Settings2, ShieldCheck, Sparkles, Trash2, UserRound, UsersRound, X } from 'lucide-react';

type TaskStatus = 'queued' | 'running' | 'waiting for user' | 'completed' | 'failed' | 'cancelled';
type Conversation = { id: string; title: string; title_edited: number; updated_at: string };
type Agent = { id: string; name: string; role: string; description: string; instructions: string; version: number; allowed_sources?: string[] };
type Task = { id: string; conversation_id: string; personal_agent_id?: string | null; personal_agent_snapshot?: { name: string; role: string; version: number } | null; prompt: string; title: string; status: TaskStatus; phase: string; blocked_reason: string | null; created_at: string; updated_at: string };
type Event = { id: number; event_type: string; detail: string; phase: string; status: TaskStatus; created_at: string };
type Message = { id: string; speaker_type: 'user' | 'agent' | 'system'; speaker_id?: string; body: string; created_at: string };
type Source = { id: string; url: string; title: string; publisher?: string; published_at?: string; verification_status: string; evidence: Evidence[] };
type Evidence = { id: string; sourceId: string; url: string; title: string; excerpt: string; locator?: string };
type Claim = { id: string; kind: 'source_fact' | 'synthesis' | 'uncertainty'; text: string; verification_status: string; evidence: Evidence[] };
type Subtask = { id: string; title: string; status: TaskStatus; phase: string; blocked_reason: string | null; agent_snapshot: { name: string; version: number } | null };
type Approval = { id: string; action: string; payload: Record<string, unknown>; payload_hash: string; status: 'pending' | 'approved' | 'rejected' | 'expired' | 'consumed'; expires_at: string; approved_at: string | null; created_at: string };
type TaskDetail = { task: Task; events: Event[]; messages: Message[]; subtasks: Subtask[]; approvals: Approval[]; sources: Source[]; claims: Claim[] };
type Schedule = { id: string; name: string; status: string; next_run_at: string | null; last_run_at: string | null; last_result: string | null; schedule_spec: string; timezone: string };
type Readiness = { provider: { ready: boolean; provider: string; model: string | null; reason: string }; researchExecution: { ready: boolean; reason: string }; oauth: { configured: boolean; mode: string } };

const STATIC_PREVIEW = import.meta.env.VITE_STATIC_PREVIEW === 'true';
const ASSET_BASE = `${import.meta.env.BASE_URL}assets/reasona/`;
const assetUrl = (file: string) => `${ASSET_BASE}${file}`;
const referenceAssets = [
  ['01_reasona_hero.png', 'Reasona 推理路徑', '研究流程主視覺'],
  ['02_planner_avatar.png', 'Planner', '規劃與排序角色示意'],
  ['03_researcher_avatar.png', 'Researcher', '來源研究角色示意'],
  ['04_reviewer_avatar.png', 'Reviewer', '證據審閱角色示意'],
  ['05_agent_collaboration_ui.png', '代理協作', '子代理群聊概念圖'],
  ['06_source_citation_card.png', '來源引用卡', '來源與引用視覺草稿'],
  ['07_task_status_flow.png', '任務狀態流程', '非即時狀態概念圖'],
  ['08_research_workspace_panel.png', '研究工作區', '工作台配置草稿'],
  ['09_knowledge_nodes.png', '知識節點', '研究關係概念圖'],
  ['10_review_view.png', '證據審查', '核查視圖草稿'],
  ['11_empty_state.png', '研究空狀態', '無任務時的視覺草稿'],
  ['12_abstract_brand_background.png', '抽象背景', '深色玻璃品牌背景草稿']
] as const;

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (STATIC_PREVIEW) throw new Error('此網站是 GitHub Pages 靜態預覽，沒有已部署的 API、資料庫或登入服務。');
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data as T;
}
const dateTime = (value?: string) => value ? new Intl.DateTimeFormat('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const statusLabel: Record<TaskStatus, string> = { queued: '排隊中', running: '執行中', 'waiting for user': '等待使用者', completed: '已完成', failed: '失敗', cancelled: '已取消' };
const statusClass: Record<TaskStatus, string> = { queued: 'queued', running: 'running', 'waiting for user': 'waiting', completed: 'completed', failed: 'failed', cancelled: 'cancelled' };
const kindLabel = { source_fact: '來源直接支持', synthesis: '跨來源綜合', uncertainty: '不確定／證據缺口' };

export function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(() => STATIC_PREVIEW ? {
    provider: { ready: false, provider: 'none', model: null, reason: 'GitHub Pages 僅提供靜態前端，API 尚未部署。' },
    researchExecution: { ready: false, reason: '後端、模型、來源檢索與 runner 均未部署。' },
    oauth: { configured: false, mode: 'static-preview' }
  } : null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [composer, setComposer] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [agentEditor, setAgentEditor] = useState<Agent | 'new' | null>(null);
  const [sourceEditor, setSourceEditor] = useState(false);
  const [claimEditor, setClaimEditor] = useState(false);
  const [sourceDraft, setSourceDraft] = useState({ url: '', title: '' });
  const [claimDraft, setClaimDraft] = useState({ kind: 'source_fact' as Claim['kind'], text: '', evidenceIds: [] as string[] });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const activeConversation = conversations.find(item => item.id === activeConversationId) || null;
  const refreshSidebar = useCallback(async () => {
    const [nextConversations, nextAgents, nextReadiness, nextSchedules] = await Promise.all([
      api<Conversation[]>('/conversations'), api<Agent[]>('/agents'), api<Readiness>('/readiness'), api<Schedule[]>('/schedules')
    ]);
    setConversations(nextConversations); setAgents(nextAgents); setReadiness(nextReadiness); setSchedules(nextSchedules);
    if (!activeConversationId && nextConversations[0]) setActiveConversationId(nextConversations[0].id);
  }, [activeConversationId]);

  const loadConversation = useCallback(async (id: string) => {
    const data = await api<{ conversation: Conversation; tasks: Task[]; messages: Message[] }>(`/conversations/${id}`);
    setTasks(data.tasks);
    setActiveTaskId(current => current && data.tasks.some(t => t.id === current) ? current : data.tasks[0]?.id || null);
  }, []);
  const loadTask = useCallback(async (id: string) => {
    const data = await api<TaskDetail>(`/tasks/${id}`);
    setDetail(data);
  }, []);

  useEffect(() => {
    if (STATIC_PREVIEW) return;
    let active = true;
    void fetch('/api/auth/status', { credentials: 'same-origin' }).then(response => response.json()).then(async auth => {
      if (!active || auth.mode !== 'google' || !auth.googleConfigured) return;
      const session = await fetch('/api/me', { credentials: 'same-origin' });
      if (active && session.status === 401) window.location.assign('/api/auth/google');
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => { if (STATIC_PREVIEW) return; refreshSidebar().catch(e => setError(e.message)); }, [refreshSidebar]);
  useEffect(() => { if (activeConversationId) loadConversation(activeConversationId).catch(e => setError(e.message)); else { setTasks([]); setActiveTaskId(null); setDetail(null); } }, [activeConversationId, loadConversation]);
  useEffect(() => { if (activeTaskId) loadTask(activeTaskId).catch(e => setError(e.message)); else setDetail(null); }, [activeTaskId, loadTask]);
  useEffect(() => {
    if (!activeTaskId || !detail) return;
    const last = detail.events.at(-1)?.id || 0;
    const stream = new EventSource(`/api/tasks/${activeTaskId}/stream?after=${last}`);
    stream.onmessage = () => { loadTask(activeTaskId).catch(() => undefined); };
    stream.addEventListener('status_changed', () => { loadTask(activeTaskId).catch(() => undefined); refreshSidebar().catch(() => undefined); });
    stream.addEventListener('approval_required', () => loadTask(activeTaskId).catch(() => undefined));
    stream.addEventListener('retry_blocked', () => loadTask(activeTaskId).catch(() => undefined));
    stream.addEventListener('message_added', () => loadTask(activeTaskId).catch(() => undefined));
    return () => stream.close();
  }, [activeTaskId, detail?.events.length, loadTask, refreshSidebar]);

  const signOut = async () => {
    try { await api<void>('/auth/logout', { method: 'POST' }); window.location.assign('/'); }
    catch (e) { setError(e instanceof Error ? e.message : '登出失敗'); }
  };

  const runAction = async (action: () => Promise<void>) => {
    if (STATIC_PREVIEW) { setError('此 GitHub Pages 頁面沒有後端；寫入、登入、核准與任務執行目前停用。'); return; }
    setError(''); setBusy(true);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '操作失敗'); }
    finally { setBusy(false); }
  };
  const createConversation = () => runAction(async () => {
    const row = await api<Conversation>('/conversations', { method: 'POST', body: JSON.stringify({}) });
    await refreshSidebar(); setActiveConversationId(row.id); setMobileNav(false);
  });
  const submitResearch = (event: FormEvent) => {
    event.preventDefault(); if (composer.trim().length < 8) return;
    runAction(async () => {
      const result = await api<{ task: Task; conversationId: string }>('/tasks', { method: 'POST', body: JSON.stringify({ prompt: composer.trim(), conversationId: activeConversationId || undefined, personalAgentId: selectedAgent || null }) });
      setComposer(''); setActiveConversationId(result.conversationId); setActiveTaskId(result.task.id);
      await refreshSidebar(); await loadConversation(result.conversationId); await loadTask(result.task.id);
    });
  };
  const sendGroupMessage = (event: FormEvent) => {
    event.preventDefault(); if (!activeTaskId || !chatDraft.trim()) return;
    runAction(async () => { await api(`/tasks/${activeTaskId}/messages`, { method: 'POST', body: JSON.stringify({ body: chatDraft.trim() }) }); setChatDraft(''); await loadTask(activeTaskId); });
  };
  const deleteConversation = () => {
    if (!deleteTarget) return;
    runAction(async () => {
      await api(`/conversations/${deleteTarget.id}`, { method: 'DELETE', body: JSON.stringify({ confirm: true, acknowledgedScope: 'conversation-tasks-messages-sources-evidence-claims-approvals' }) });
      if (activeConversationId === deleteTarget.id) { setActiveConversationId(null); setDetail(null); setActiveTaskId(null); }
      setDeleteTarget(null); await refreshSidebar();
    });
  };
  const renameConversation = () => {
    if (!activeConversation) return;
    const title = window.prompt('編輯對話名稱', activeConversation.title);
    if (!title?.trim()) return;
    runAction(async () => { await api(`/conversations/${activeConversation.id}`, { method: 'PATCH', body: JSON.stringify({ title: title.trim() }) }); await refreshSidebar(); });
  };
  const saveAgent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const values = { name: String(form.get('name') || '').trim(), role: String(form.get('role') || '').trim(), description: String(form.get('description') || '').trim(), instructions: String(form.get('instructions') || '').trim(), allowedSources: [] as string[] };
    if (values.instructions.length === 0) return;
    runAction(async () => {
      const editing = typeof agentEditor === 'object' && agentEditor !== null;
      await api(editing ? `/agents/${agentEditor.id}` : '/agents', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values) });
      setAgentEditor(null); await refreshSidebar();
    });
  };
  const addSource = (event: FormEvent) => {
    event.preventDefault(); if (!activeTaskId) return;
    runAction(async () => { await api(`/tasks/${activeTaskId}/sources`, { method: 'POST', body: JSON.stringify(sourceDraft) }); setSourceDraft({ url: '', title: '' }); setSourceEditor(false); await loadTask(activeTaskId); });
  };
  const addEvidence = (source: Source) => {
    const excerpt = window.prompt('貼上來源中的原文段落（目前只記錄你提供的片段，不會自動擷取或驗證網頁）');
    if (!excerpt?.trim() || !activeTaskId) return;
    const locator = window.prompt('段落位置（可留空，例如標題或頁碼）') || undefined;
    runAction(async () => { await api(`/tasks/${activeTaskId}/sources/${source.id}/evidence`, { method: 'POST', body: JSON.stringify({ excerpt: excerpt.trim(), locator }) }); await loadTask(activeTaskId); });
  };
  const addClaim = (event: FormEvent) => {
    event.preventDefault(); if (!activeTaskId) return;
    runAction(async () => { await api(`/tasks/${activeTaskId}/claims`, { method: 'POST', body: JSON.stringify(claimDraft) }); setClaimDraft({ kind: 'source_fact', text: '', evidenceIds: [] }); setClaimEditor(false); await loadTask(activeTaskId); });
  };
  const retryTask = () => activeTaskId && runAction(async () => { try { await api(`/tasks/${activeTaskId}/retry`, { method: 'POST', body: '{}' }); } catch (e) { if (e instanceof Error) setError(e.message); } await loadTask(activeTaskId); });
  const cancelTask = () => activeTaskId && runAction(async () => { await api(`/tasks/${activeTaskId}/cancel`, { method: 'POST', body: '{}' }); await loadTask(activeTaskId); await refreshSidebar(); });
  const decideApproval = (approval: Approval, decision: 'approve' | 'reject') => {
    const payloadText = JSON.stringify(approval.payload, null, 2);
    const verb = decision === 'approve' ? '核准' : '拒絕';
    const warning = decision === 'approve' ? '\n\n目前沒有外部執行器；核准只會留下紀錄，不會寄送、發布或改變外部狀態。' : '\n\n拒絕只會留下紀錄，不會執行外部操作。';
    if (!window.confirm(`請確認你要${verb}以下精確動作：\n\n${approval.action}\n\n參數：\n${payloadText}\n\nSHA-256：${approval.payload_hash}${warning}`)) return;
    runAction(async () => {
      const body = decision === 'approve' ? { confirm: true, payload: approval.payload } : { confirm: true, payloadHash: approval.payload_hash };
      await api(`/approvals/${approval.id}/${decision}`, { method: 'POST', body: JSON.stringify(body) });
      if (activeTaskId) await loadTask(activeTaskId);
    });
  };

  const currentEvents = detail?.events || [];
  const factCount = detail?.claims.filter(c => c.kind === 'source_fact').length || 0;
  const claimCount = detail?.claims.length || 0;
  const groupMessages = detail?.messages || [];
  const eventTitle = useMemo(() => detail?.task.title || activeConversation?.title || '新的研究任務', [detail?.task.title, activeConversation?.title]);

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileNav ? 'mobile-nav-open' : ''}`}>
    <aside className="sidebar" aria-label="工作區側欄">
      <div className="brand-row"><div className="brand-mark" aria-hidden="true"><span>R</span></div><div className="brand-copy"><strong>Reasona</strong><small>RESEARCH WORKSPACE</small></div><button className="icon-button sidebar-collapse" aria-label="收合側欄" onClick={() => setCollapsed(v => !v)}><PanelLeftClose size={16}/></button></div>
      <button className="new-conversation" onClick={createConversation} disabled={STATIC_PREVIEW} title={STATIC_PREVIEW ? '靜態預覽沒有 API 或資料庫' : undefined}><Plus size={16}/><span>新增研究對話</span><kbd>⌘ K</kbd></button>
      <div className="side-section"><div className="side-heading"><span>工作區</span><button className="icon-button small" aria-label="搜尋對話" onClick={() => document.getElementById('research-input')?.focus()}><Search size={14}/></button></div>
        <nav className="conversation-list" aria-label="對話列表">
          {conversations.map(conv => <div key={conv.id} className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}>
            <button className="conversation-select" onClick={() => { setActiveConversationId(conv.id); setMobileNav(false); }}><MessageSquareText size={15}/><span>{conv.title}</span></button>
            <button className="row-delete icon-button small" aria-label={`刪除對話 ${conv.title}`} onClick={() => setDeleteTarget(conv)} disabled={STATIC_PREVIEW}><Trash2 size={13}/></button>
          </div>)}
          {!conversations.length && <p className="sidebar-empty">建立第一個研究對話，所有資料會分開保存。</p>}
        </nav>
      </div>
      <div className="side-section agent-list-section"><div className="side-heading"><span>個人 Agent</span><button className="icon-button small" aria-label="新增個人 Agent" onClick={() => setAgentEditor('new')} disabled={STATIC_PREVIEW}><Plus size={14}/></button></div>
        <div className="agent-list">{agents.map(agent => <button className={`agent-row ${agent.id === selectedAgent ? 'chosen' : ''}`} key={agent.id} onClick={() => { setSelectedAgent(agent.id); setAgentEditor(agent); }}><span className="agent-avatar"><Bot size={15}/></span><span><b>{agent.name}</b><small>{agent.role} · v{agent.version}</small></span><Settings2 size={13} className="agent-settings"/></button>)}
          {!agents.length && <p className="sidebar-empty">尚無個人 Agent。建立設定後可用於新任務；設定本身不代表代理已執行。</p>}</div>
      </div>
      <div className="sidebar-bottom"><div className="local-user"><span className="user-avatar"><UserRound size={16}/></span><span><b>{STATIC_PREVIEW ? '公開靜態預覽' : readiness?.oauth.mode === 'google' ? 'Google 工作區' : '本機工作區'}</b><small>{STATIC_PREVIEW ? '無登入、API 或資料儲存' : readiness?.oauth.mode === 'local' ? 'Local development · 非 Google 登入' : '登入與權限依 owner 隔離'}</small></span>{!STATIC_PREVIEW && readiness?.oauth.mode === 'google' ? <button className="icon-button small" onClick={signOut} aria-label="登出 Google 工作區" title="登出"><LogOut size={14}/></button> : !STATIC_PREVIEW && <ChevronDown size={14}/>}</div><div className="privacy-note"><ShieldCheck size={13}/><span>{STATIC_PREVIEW ? '此靜態頁不儲存或讀取你的研究資料' : readiness?.oauth.mode === 'local' ? '本機單一使用者 · 僅開發環境' : '使用者資料依 owner 隔離'}</span></div></div>
    </aside>
    <button className="mobile-scrim" aria-label="關閉選單" onClick={() => setMobileNav(false)} />

    <main className="workspace">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" aria-label="開啟導覽" onClick={() => setMobileNav(true)}><Menu size={18}/></button><span className="breadcrumb">研究工作區</span><span className="breadcrumb-divider">/</span><span className="breadcrumb-current">{activeConversation?.title || '尚未選擇對話'}</span><button className="icon-button small rename-button" aria-label="編輯對話名稱" disabled={!activeConversation || STATIC_PREVIEW} onClick={renameConversation}><Settings2 size={14}/></button></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot muted"/>{STATIC_PREVIEW ? 'GitHub Pages · 靜態預覽' : '開發環境'}</span><button className="icon-button" aria-label="說明" title="所有研究執行在 provider 與來源工具明確設定前保持停用"><CircleHelp size={17}/></button></div></header>
      <div className="content-scroll">
        <div className="content-wrap">
          {STATIC_PREVIEW && <div className="preview-banner" role="status"><ShieldCheck size={16}/><span><b>靜態網站預覽</b> · 此 GitHub Pages 網站沒有 SQLite、API、Google 登入或 AI runner。研究操作已停用；不會儲存你的輸入，也不會產生模擬答案。</span><a href="https://github.com/xiaoyu0712-beep/Reasona-AI-Agent/blob/main/README.md" target="_blank" rel="noreferrer">設定與限制 <ArrowUpRight size={12}/></a></div>}
          {error && <div className="alert error-alert" role="alert"><CircleHelp size={16}/><span>{error}</span><button className="icon-button small" onClick={() => setError('')} aria-label="關閉錯誤"><X size={14}/></button></div>}
          <section className="task-heading">
            <div className="heading-copy"><div className="eyebrow"><span>研究任務</span><span className="eyebrow-dot">·</span><span>{detail ? dateTime(detail.task.created_at) : '新工作階段'}</span></div><h1>{eventTitle}</h1><p>{detail?.task.prompt || '以可追溯來源建立研究短報告。輸入研究問題後，系統會記錄任務；未設定 AI 與來源工具時不會假裝執行。'}</p></div>
            <div className="heading-actions">{detail && <><button className="button secondary" onClick={retryTask} disabled={busy || detail.task.status === 'cancelled' || detail.task.status === 'completed'}><RefreshCw size={14}/>檢查重試條件</button>{['queued','running','waiting for user'].includes(detail.task.status) && <button className="button ghost" onClick={cancelTask} disabled={busy}><X size={14}/>取消</button>}</>}</div>
          </section>

          <section className="status-panel glass-panel" aria-label="任務狀態與分工">
            <div className="status-overview"><div className="status-main"><span className={`status-icon ${detail ? statusClass[detail.task.status] : 'idle'}`}>{detail?.task.status === 'running' ? <LoaderCircle size={17} className="actual-running"/> : <Activity size={16}/>}</span><div><small>真實任務狀態</small><strong>{detail ? statusLabel[detail.task.status] : '尚未建立任務'}</strong></div></div><div className="status-divider"/><div className="status-phase"><small>目前階段</small><strong>{detail?.task.phase || '等待研究問題'}</strong></div><div className="status-divider wide-only"/><div className="status-agent"><div className="stacked-avatars"><span><Sparkles size={13}/></span><span><Bot size={13}/></span></div><div><small>代理分工</small><strong>{detail ? (detail.task.personal_agent_snapshot ? `${detail.task.personal_agent_snapshot.name} · v${detail.task.personal_agent_snapshot.version}` : '主 Agent · 尚未啟動') : '尚未分派'}</strong></div></div></div>
            {detail?.task.blocked_reason && <div className="blocked-callout"><div className="blocked-sign"><CircleHelp size={15}/></div><div><b>任務受阻，未執行模型或代理</b><p>{detail.task.blocked_reason}</p></div><button className="text-button" onClick={() => window.open('#setup', '_self')}>查看設定方式 <ArrowUpRight size={13}/></button></div>}
            {!detail && <div className="status-footnote">狀態只由後端持久事件提供；不顯示虛構百分比。</div>}
          </section>

          <div className="research-layout">
            <section className="research-main">
              {!detail ? <div className="empty-research glass-panel"><img className="empty-research-art" src={assetUrl('11_empty_state.png')} alt="" aria-hidden="true"/><div className="empty-orbit"><Layers3 size={22}/></div><div className="eyebrow">SOURCE-GROUNDED RESEARCH</div><h2>把問題交給可核查的研究流程</h2><p>{STATIC_PREVIEW ? '此 GitHub Pages 預覽尚無後端、模型或來源工具。資料輸入與任務操作已停用，不會產生假研究內容。' : '任務會先記錄為待處理狀態。AI 尚未就緒時，不會產生模型回答、代理回報或假進度。'}</p><div className="empty-points"><span><Check size={13}/>對話彼此隔離</span><span><Check size={13}/>逐項來源關聯</span><span><Check size={13}/>失敗原因可見</span></div></div> : <>
                <section className="report-card glass-panel"><div className="section-title-row"><div><div className="eyebrow">SHORT REPORT</div><h2>研究紀錄</h2></div><div className="report-meta"><span><FilePlus2 size={13}/>{claimCount} 條主張</span><span><Archive size={13}/>{detail.sources.length} 個來源</span></div></div>
                  {detail.claims.length ? <div className="claim-list">{detail.claims.map(claim => <article className="claim-card" key={claim.id}><div className="claim-label-row"><span className={`claim-type ${claim.kind}`}>{kindLabel[claim.kind]}</span><span className="unreviewed-badge">未經核查</span></div><p>{claim.text}</p>{claim.evidence.filter(e => e.id).length > 0 && <div className="claim-evidence">{claim.evidence.filter(e => e.id).map(e => <a key={e.id} href={e.url} target="_blank" rel="noreferrer"><span className="evidence-marker">↳</span><span><b>{e.title}</b><small>{e.locator || '來源片段'}：{e.excerpt}</small></span><ArrowUpRight size={13}/></a>)}</div>}{claim.kind === 'uncertainty' && !claim.evidence.filter(e => e.id).length && <p className="uncertainty-note">目前沒有連結證據，保留為明確缺口。</p>}</article>)}</div> : <div className="report-empty"><div className="report-empty-icon"><FilePlus2 size={17}/></div><div><b>尚無研究主張</b><p>只有在你加入具體來源與 evidence span 後，才能記錄主張。系統不會自動生成報告。</p></div></div>}
                  <div className="report-actions"><button className="button secondary" onClick={() => setSourceEditor(true)} disabled={STATIC_PREVIEW || !activeTaskId}><Plus size={14}/>加入來源</button><button className="button secondary" onClick={() => setClaimEditor(true)} disabled={STATIC_PREVIEW || !activeTaskId}><Plus size={14}/>記錄主張</button></div>
                </section>
                <section className="sources-card glass-panel"><div className="section-title-row compact"><div><div className="eyebrow">SOURCE LEDGER</div><h3>來源與證據</h3></div><span className="counter-pill">{detail.sources.length}</span></div>
                  {!detail.sources.length ? <p className="small-muted">尚無來源。加入來源 URL 與人工提供的具體摘錄；此版本不會自動擷取網頁，也不會把連結視為已驗證。</p> : <div className="source-list">{detail.sources.map(source => <article className="source-row" key={source.id}><div className="source-icon"><Archive size={15}/></div><div className="source-info"><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={12}/></a><span>{source.publisher || new URL(source.url).hostname} · 未驗證 · {source.evidence?.length || 0} 段 evidence</span></div><button className="text-button" onClick={() => addEvidence(source)}>加入摘錄</button></article>)}</div>}
                </section>
                <section className="activity-card glass-panel"><div className="section-title-row compact"><div><div className="eyebrow">PERSISTED EVENTS</div><h3>任務事件</h3></div><Radio size={15}/></div>{currentEvents.length ? <ol className="event-list">{currentEvents.map(event => <li key={event.id}><span className="event-marker"/><div><b>{event.detail}</b><small>{event.phase} · {dateTime(event.created_at)}</small></div><span className={`mini-status ${statusClass[event.status]}`}>{statusLabel[event.status]}</span></li>)}</ol> : <p className="small-muted">此任務尚無持久事件。</p>}</section>
                <section className="approval-card glass-panel"><div className="section-title-row compact"><div><div className="eyebrow">EXTERNAL ACTION GATE</div><h3>操作核准</h3></div><span className="channel-lock"><ShieldCheck size={13}/>{detail.approvals.length} 項</span></div>{detail.approvals.length ? <div className="approval-list">{detail.approvals.map(approval => <article className="approval-item" key={approval.id}><div className="approval-heading"><b>{approval.action}</b><span className={`approval-status ${approval.status}`}>{approval.status === 'pending' ? '等待確認' : approval.status === 'approved' ? '已核准（只記錄）' : approval.status === 'rejected' ? '已拒絕' : approval.status === 'expired' ? '已過期' : '已消耗'}</span></div><p className="small-muted">精確參數（核准會比對 SHA-256；逾期不可核准）</p><pre className="approval-payload">{JSON.stringify(approval.payload, null, 2)}</pre><code className="approval-hash">SHA-256 · {approval.payload_hash}</code><small className="approval-expiry">到期：{dateTime(approval.expires_at)}</small>{approval.status === 'pending' && <div className="approval-actions"><button className="button secondary mini" onClick={() => decideApproval(approval, 'reject')} disabled={busy || STATIC_PREVIEW}>拒絕此動作</button><button className="button primary mini" onClick={() => decideApproval(approval, 'approve')} disabled={busy || STATIC_PREVIEW}>確認核准精確 payload</button></div>}</article>)}</div> : <p className="small-muted">目前沒有待核准操作。此版本不會自動提出外部操作，也沒有外部執行器。</p>}</section>
              </>}

              <section className="composer-card glass-panel"><div className="composer-label"><span><Sparkles size={14}/>開始或追問</span><span className="composer-limit">{STATIC_PREVIEW ? '預覽模式 · 輸入與執行已停用' : '至少 8 個字 · 不會在 AI 未就緒時執行'}</span></div><form onSubmit={submitResearch}><textarea id="research-input" value={composer} onChange={e => setComposer(e.target.value)} placeholder={STATIC_PREVIEW ? '此靜態頁不會讀取或儲存研究輸入。' : activeConversationId ? '補充研究問題或建立新的研究任務…' : '輸入研究問題，例如：比較三種公開資料來源的更新頻率與限制…'} rows={3} aria-label="研究問題" disabled={STATIC_PREVIEW}/><div className="composer-footer"><label className="agent-picker"><Bot size={14}/><span>使用個人 Agent</span><select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} aria-label="選用個人 Agent" disabled={STATIC_PREVIEW}><option value="">未選擇</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.name}（v{agent.version}）</option>)}</select></label><button className="button primary" type="submit" disabled={STATIC_PREVIEW || busy || composer.trim().length < 8}><span>{STATIC_PREVIEW ? '後端未部署' : busy ? '記錄中…' : '建立研究任務'}</span><Send size={14}/></button></div></form></section>
            </section>

            <aside className="research-rail" aria-label="研究狀態與代理群聊">
              <section className="readiness-card glass-panel"><div className="rail-heading"><span className="rail-icon"><ShieldCheck size={15}/></span><div><small>執行準備狀態</small><b>AI 與來源工具</b></div><span className="not-ready-pill"><i/>未就緒</span></div><div className="readiness-body"><p>{STATIC_PREVIEW ? 'GitHub Pages 只提供靜態前端；API、SQLite 與 AI runner 尚未部署。' : readiness?.researchExecution.reason || '正在讀取後端設定。'}</p><div className="readiness-items"><div><span>模型 provider</span><b>{STATIC_PREVIEW ? '後端未部署' : readiness?.provider.ready ? readiness.provider.model : '未設定'}</b></div><div><span>來源搜尋／擷取</span><b>未接通</b></div><div><span>Google OAuth</span><b>{STATIC_PREVIEW ? '此頁沒有登入服務' : readiness?.oauth.configured ? '已設環境值（未驗證同意）' : '佔位，未設定'}</b></div></div><a className="setup-link" id="setup" href="https://github.com/xiaoyu0712-beep/Reasona-AI-Agent/blob/main/README.md" target="_blank" rel="noreferrer">檢視 README 設定步驟 <ArrowUpRight size={13}/></a></div></section>
              <section className="schedule-card glass-panel"><div className="section-title-row compact"><div><div className="eyebrow">SCHEDULES</div><h3>排程</h3></div><span className="channel-lock"><Clock3 size={13}/>{schedules.length} 項</span></div><div className="schedule-columns"><span>名稱</span><span>下次執行</span><span>上次結果</span></div>{schedules.length ? schedules.map(schedule => <div className="schedule-row" key={schedule.id}><div><b>{schedule.name}</b><small>{schedule.status}</small></div><span>{schedule.next_run_at ? dateTime(schedule.next_run_at) : '未排定'}</span><span>{schedule.last_result || '尚未執行'}</span></div>) : <div className="schedule-empty"><p>排程執行器未接通，沒有已啟用的排程。下次執行與上次結果保持空白，不顯示虛構時間。</p></div>}</section>
              <section className="group-chat-card glass-panel"><div className="section-title-row compact"><div><div className="eyebrow">TASK CHANNEL</div><h3>代理群聊</h3></div><span className="channel-lock"><UsersRound size={14}/>任務內</span></div><div className="chat-context"><span className="chat-context-icon"><UsersRound size={15}/></span><div><b>{detail?.task.title || '尚無活動任務'}</b><small>訊息只屬於此任務與對話</small></div><div className="agent-illustrations" aria-label="Planner、Researcher、Reviewer 角色插圖；非即時執行狀態">{referenceAssets.slice(1, 4).map(([file, name]) => <img key={file} src={assetUrl(file)} alt={`${name} 角色插圖；非即時執行狀態`} loading="lazy"/>)}</div></div><p className="illustration-note">角色圖片僅為視覺素材，不表示目前有代理正在執行。</p>{detail?.subtasks?.length ? <div className="subtask-list">{detail.subtasks.map(subtask => <div className="subtask-row" key={subtask.id}><span className="event-marker"/><span><b>{subtask.title}</b><small>{subtask.agent_snapshot ? `${subtask.agent_snapshot.name} · v${subtask.agent_snapshot.version}` : '未指派 Agent'} · {subtask.phase}</small></span><em>{statusLabel[subtask.status]}</em></div>)}</div> : <p className="subtask-empty">子代理分工尚未建立。AI runner 未就緒；此處沒有虛構的子任務或代理回報。</p>}
                {!groupMessages.length ? <div className="chat-empty"><div className="chat-empty-icon"><MessageSquareText size={16}/></div><p>尚無群聊訊息。模型未就緒，因此沒有代理回報或代理發言。</p></div> : <div className="group-messages">{groupMessages.map(message => <article key={message.id} className={`message-row ${message.speaker_type}`}><span className="message-avatar">{message.speaker_type === 'user' ? <UserRound size={13}/> : <Bot size={13}/>}</span><div><div className="message-author">{message.speaker_type === 'user' ? '你' : message.speaker_type === 'agent' ? 'Agent' : '系統'}<time>{dateTime(message.created_at)}</time></div><p>{message.body}</p></div></article>)}</div>}
                <form className="chat-composer" onSubmit={sendGroupMessage}><input value={chatDraft} onChange={e => setChatDraft(e.target.value)} placeholder={STATIC_PREVIEW ? '靜態預覽沒有群聊 API' : activeTaskId ? '在此任務留言…' : '建立任務後可留言'} aria-label="任務群聊訊息" disabled={STATIC_PREVIEW || !activeTaskId}/><button className="icon-button send-small" type="submit" disabled={STATIC_PREVIEW || !activeTaskId || !chatDraft.trim()} aria-label="送出任務訊息"><Send size={14}/></button></form>
              </section>
              <section className="integrity-card"><div className="integrity-icon"><ShieldCheck size={14}/></div><p><b>來源誠信</b><span>{factCount} 項來源型主張；全部仍需人工核查。來源記錄不代表其內容已支持主張。</span></p></section>
              <section className="audit-peek"><div><Activity size={14}/><span>任務稽核</span></div><small>{detail ? `${currentEvents.length} 個持久狀態事件` : '建立任務後顯示事件紀錄'}</small></section>
            </aside>
          </div>
          <section className="asset-gallery glass-panel" aria-labelledby="asset-gallery-title"><div className="section-title-row compact"><div><div className="eyebrow">REFERENCE ARTWORK</div><h3 id="asset-gallery-title">附件視覺素材 · 12 張 PNG</h3></div><span className="counter-pill">12</span></div><p className="small-muted">全數為黑白灰液態玻璃概念草稿，尚非核准品牌或執行狀態。點圖可開啟原始 PNG。</p><div className="asset-grid">{referenceAssets.map(([file, title, description]) => <a className="asset-tile" key={file} href={assetUrl(file)} target="_blank" rel="noreferrer"><img src={assetUrl(file)} alt={title} loading="lazy" decoding="async"/><span><b>{title}</b><small>{description}</small></span></a>)}</div></section>
          <footer className="workspace-footer"><span>REASONA · 來源密集研究工作台</span><span>未驗證的工作流假設 · 不代表市場驗證</span></footer>
        </div>
      </div>
    </main>

    {deleteTarget && <div className="modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="modal-mark danger"><Trash2 size={17}/></div><h2 id="delete-title">刪除這個對話？</h2><p><b>{deleteTarget.title}</b> 及其中的任務、訊息、來源、evidence、主張、核准資料與代理暫存都會被移除。操作稽核紀錄會保留不含正文的 metadata。此操作無法復原。</p><div className="modal-actions"><button className="button secondary" onClick={() => setDeleteTarget(null)}>取消</button><button className="button danger-button" onClick={deleteConversation} disabled={busy}><Trash2 size={14}/>確認刪除整個對話範圍</button></div></section></div>}
    {agentEditor && <div className="modal-backdrop" role="presentation"><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="agent-title"><div className="modal-head"><div><div className="eyebrow">PERSONAL AGENT</div><h2 id="agent-title">{agentEditor === 'new' ? '建立個人 Agent' : '編輯個人 Agent'}</h2></div><button className="icon-button" onClick={() => setAgentEditor(null)} aria-label="關閉"><X size={16}/></button></div><p className="small-muted">設定只會保存供新任務選用；不會自動啟動，也不代表具備資料或工具權限。</p><form onSubmit={saveAgent} className="form-stack"><label>名稱<input name="name" required maxLength={60} defaultValue={typeof agentEditor === 'object' ? agentEditor.name : ''} placeholder="例如：政策研究助理"/></label><label>角色<input name="role" required maxLength={80} defaultValue={typeof agentEditor === 'object' ? agentEditor.role : ''} placeholder="例如：來源核查"/></label><label>簡介<input name="description" required maxLength={240} defaultValue={typeof agentEditor === 'object' ? agentEditor.description : ''} placeholder="描述適用任務"/></label><label>指示<textarea name="instructions" rows={4} required maxLength={4000} defaultValue={typeof agentEditor === 'object' ? agentEditor.instructions : ''} placeholder="說明研究方法與限制；伺服器仍會強制權限邊界。"/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setAgentEditor(null)}>取消</button><button className="button primary" type="submit">儲存設定 <Check size={14}/></button></div></form></section></div>}
    {sourceEditor && <div className="modal-backdrop" role="presentation"><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="source-title"><div className="modal-head"><div><div className="eyebrow">SOURCE REGISTER</div><h2 id="source-title">加入來源</h2></div><button className="icon-button" onClick={() => setSourceEditor(false)} aria-label="關閉"><X size={16}/></button></div><p className="small-muted">只記錄 HTTPS 來源 URL 與你提供的標題；尚未抓取、開啟或驗證。</p><form onSubmit={addSource} className="form-stack"><label>來源標題<input required maxLength={300} value={sourceDraft.title} onChange={e => setSourceDraft({ ...sourceDraft, title: e.target.value })}/></label><label>具體頁面 URL<input type="url" required placeholder="https://…" value={sourceDraft.url} onChange={e => setSourceDraft({ ...sourceDraft, url: e.target.value })}/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setSourceEditor(false)}>取消</button><button className="button primary" type="submit">記錄來源 <Plus size={14}/></button></div></form></section></div>}
    {claimEditor && <div className="modal-backdrop" role="presentation"><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="claim-title"><div className="modal-head"><div><div className="eyebrow">CLAIM TRACE</div><h2 id="claim-title">記錄研究主張</h2></div><button className="icon-button" onClick={() => setClaimEditor(false)} aria-label="關閉"><X size={16}/></button></div><p className="small-muted">主張會標為未經核查。事實主張需至少連結一段本任務來源 evidence；系統不會替你斷言來源支持程度。</p><form onSubmit={addClaim} className="form-stack"><label>主張類型<select value={claimDraft.kind} onChange={e => setClaimDraft({ ...claimDraft, kind: e.target.value as Claim['kind'] })}>{Object.entries(kindLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>主張內容<textarea rows={3} required maxLength={3000} value={claimDraft.text} onChange={e => setClaimDraft({ ...claimDraft, text: e.target.value })}/></label>{claimDraft.kind !== 'uncertainty' && <fieldset className="evidence-picker"><legend>連結 evidence span</legend>{(detail?.sources || []).flatMap(source => (source.evidence || []).map(evidence => <label className="evidence-check-row" key={evidence.id}><input type="checkbox" checked={claimDraft.evidenceIds.includes(evidence.id)} onChange={e => setClaimDraft(prev => ({ ...prev, evidenceIds: e.target.checked ? [...prev.evidenceIds, evidence.id] : prev.evidenceIds.filter(id => id !== evidence.id) }))}/><span><b>{source.title}</b><small>{evidence.locator || '來源段落'}：{evidence.excerpt}</small></span></label>))}{!(detail?.sources || []).some(source => source.evidence?.length) && <p className="small-muted">尚無 evidence span。先在來源列使用「加入摘錄」。</p>}</fieldset>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => setClaimEditor(false)}>取消</button><button className="button primary" type="submit">保存主張 <Check size={14}/></button></div></form></section></div>}
  </div>;
}
