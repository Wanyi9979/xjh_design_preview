import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { App as AntApp, Avatar, Badge, Button, Checkbox, Collapse, ConfigProvider, DatePicker, Drawer, Dropdown, Empty, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Switch, Tabs, Tag, TimePicker, Tooltip } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, AudioOutlined, BulbFilled, CalendarFilled, CalendarOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, FileTextFilled, FullscreenExitOutlined, FullscreenOutlined, HeartOutlined, HistoryOutlined, HomeOutlined, MessageFilled, MoreOutlined, PhoneFilled, PrinterOutlined, ProductFilled, QuestionCircleOutlined, ReadFilled, RightOutlined, SafetyCertificateOutlined, SearchOutlined, ShareAltOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Bubble, Prompts, Sender, Welcome } from '@ant-design/x';
import type { SenderRef, SlotConfigType } from '@ant-design/x/es/sender';
import dayjs from 'dayjs';
import { BusinessWorkspace, PatientDetail } from './BusinessWorkspace';
import { AnswerActions, AnswerContent, BriefShareModal, WorkflowSettings } from './WorkflowPanels';
import type { FollowUpQuestion } from './followUpQuestions';
import { admissionDateRuleLabel, nextScheduleExecution, scheduleAdmissionDate, scheduleNextRunLabel, type ScheduleDraft, type ScheduledTask, type ScheduleRun, type ScheduleRunStatus } from './scheduleData';
import { decodeSharePayload, defaultTemplate, detectIntent, draftTaskPrompts, getDefaultTemplate, getPatient, isBriefTask, type BriefTemplate, briefTypes, buildDemoReply, demoPatients, makeInitialConversations, productHelp, resolveAdmissionDate, scopeLabel, tasks, type BriefType, type BusinessPage, type ChatMessage, type Conversation, type DetailTarget, type QueryContext, type SharePayload, type SourceRecord, type TaskType } from './assistantData';

type PanelView = 'closed' | 'small' | 'large' | 'split' | 'task-center';
type LauncherDragState = { pointerId: number; startY: number; startTop: number; startOffsetY: number; moved: boolean };
type BriefRequest = { task: BriefType; text: string; context: QueryContext };
type RecordsTab = 'conversations' | 'schedules';
type ConversationView = 'recent' | 'patient';
type ConversationSource = 'all' | 'manual' | 'automatic';
type SpeechRecognitionResultLike = { 0: { transcript: string }; length: number };
type SpeechRecognitionEventLike = Event & { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionErrorEventLike = Event & { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
const ASSISTANT_PANEL_MIN_WIDTH = 320;
const ASSISTANT_PANEL_MAX_WIDTH = 640;
function FigmaIcon({ name }: { name: string }) { return <img className="figma-icon" src={`/figma-cares/${name}.svg`} alt="" aria-hidden="true" />; }
const emptySlotConfig: readonly SlotConfigType[] = [];
const taskIcons: Record<TaskType, ReactNode> = { knowledge: <ReadFilled />, call: <PhoneFilled />, admission: <CalendarFilled />, summary: <FileTextFilled />, explain: <BulbFilled />, communication: <MessageFilled />, product: <ProductFilled /> };
const navItems: { key: BusinessPage; label: string; icon: ReactNode }[] = [
  { key: 'workbench', label: '工作台', icon: <HomeOutlined /> }, { key: 'patients', label: '患者', icon: <TeamOutlined /> },
  { key: 'admissions', label: '入院', icon: <CalendarOutlined /> }, { key: 'followups', label: '随访', icon: <HeartOutlined /> },
];

const initialScheduledTasks: ScheduledTask[] = [
  {
    id: 'auto-call', type: 'call', name: '呼叫前简报', enabled: true, scope: ['all'], leadMinutes: 30,
    callTriggers: ['admission', 'incomplete-plan'], pushTime: '08:00',
    nextRun: '每天 08:00 检查触发条件',
    lastRun: { id: 'call-run-1', time: '今天 09:30', status: 'success', detail: '陈某 · 呼叫前简报已生成', conversationKey: 'demo-1' },
    runs: [
      { id: 'call-run-1', time: '今天 09:30', status: 'success', detail: '陈某 · 呼叫前简报已生成', conversationKey: 'demo-1' },
      { id: 'call-run-2', time: '昨天 14:00', status: 'skipped', detail: '无符合条件的计划呼叫患者' },
    ],
  },
  {
    id: 'auto-admission', type: 'admission', name: '入院简报', enabled: true, scope: ['all'], time: '17:00', repeat: 'daily', aggregation: 'all', admissionDateMode: 'relative', admissionDays: 1,
    nextRun: '今天 17:00',
    lastRun: { id: 'admission-run-1', time: '今天 08:00', status: 'success', detail: '明日入院准备情况已生成', conversationKey: 'demo-2' },
    runs: [{ id: 'admission-run-1', time: '今天 08:00', status: 'success', detail: '明日入院准备情况已生成', conversationKey: 'demo-2' }],
  },
];

function IconButton({ label, icon, onClick, className = '' }: { label: string; icon: ReactNode; onClick: () => void; className?: string }) {
  return <Tooltip title={label}><Button type="text" className={`icon-button ${className}`} aria-label={label} icon={icon} onClick={onClick} /></Tooltip>;
}

function NewTaskIcon() {
  return <svg className="new-task-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M42 26V40C42 41.1046 41.1046 42 40 42H8C6.89543 42 6 41.1046 6 40V8C6 6.89543 6.89543 6 8 6L22 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 26.7199V34H21.3172L42 13.3081L34.6951 6L14 26.7199Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
  </svg>;
}

function conversationPatientId(conversation?: Conversation) {
  return [...(conversation?.messages ?? [])].reverse().find(item => item.context)?.context?.patientId;
}

function conversationPatientScope(conversation?: Conversation) {
  const context = [...(conversation?.messages ?? [])].reverse().find(item => item.context)?.context;
  if (context?.patientIds?.length) return context.patientIds;
  return context?.patientId && context.patientId !== 'all' ? [context.patientId] : ['all'];
}

function samePatientScope(left: string[], right: string[]) {
  return left.length === right.length && left.every(value => right.includes(value));
}

function Mascot({ className = '' }: { className?: string }) {
  const src = className.includes('welcome-mascot') ? '/cares-mascot.png' : '/cares-avatar-figma.png';
  return <span className={`mascot-portrait ${className}`} aria-hidden="true"><img src={src} alt="" draggable={false} /></span>;
}

function AssistantLauncherMascot() {
  const armShape = 'M 300 607 C 324 584 372 585 397 626 L 415 649 C 445 607 477 623 473 663 L 466 702 L 496 738 L 514 765 L 572 800 L 625 799 L 651 868 C 627 910 572 937 511 922 L 451 901 L 402 870 L 352 818 L 314 788 L 277 745 L 255 691 L 279 645 Z';
  return <>
    <span className="assistant-peek-art" aria-hidden="true">
      <span className="assistant-mascot-rig">
        <svg className="assistant-rig-canvas" viewBox="0 0 1024 1536" focusable="false">
          <defs>
            <clipPath id="cares-peek-arm"><path d={armShape} /></clipPath>
            <clipPath id="cares-peek-eyes"><ellipse cx="540" cy="458" rx="69" ry="64" transform="rotate(-18 540 458)" /><ellipse cx="720" cy="395" rx="73" ry="66" transform="rotate(-18 720 395)" /></clipPath>
            <mask id="cares-peek-body" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1536">
              <rect width="1024" height="1536" fill="white" /><path d={armShape} fill="black" />
            </mask>
          </defs>
          <image href="/cares-mascot-peek-full.png" width="1024" height="1536" mask="url(#cares-peek-body)" />
          <image href="/cares-mascot-peek-repair.png" width="1024" height="1536" clipPath="url(#cares-peek-arm)" />
          <g className="assistant-rig-blink" clipPath="url(#cares-peek-eyes)"><image href="/cares-mascot-peek-repair.png" width="1024" height="1536" /></g>
          <g className="assistant-rig-arm"><image href="/cares-mascot-peek-full.png" width="1024" height="1536" clipPath="url(#cares-peek-arm)" /></g>
        </svg>
      </span>
    </span>
  </>;
}

export default function App() {
  const { message, modal } = AntApp.useApp();
  const [page, setPage] = useState<BusinessPage>('workbench');
  const [businessDetail, setBusinessDetail] = useState<DetailTarget>();
  const [panelView, setPanelView] = useState<PanelView>('closed');
  const [launcherOpening, setLauncherOpening] = useState(false);
  const [launcherOffsetY, setLauncherOffsetY] = useState(0);
  const [launcherDragging, setLauncherDragging] = useState(false);
  const [taskCenterReturnView, setTaskCenterReturnView] = useState<Exclude<PanelView, 'closed' | 'task-center'>>('large');
  const [detail, setDetail] = useState<DetailTarget>();
  const [previewPayload, setPreviewPayload] = useState<SharePayload>();
  const [sourceMessageId, setSourceMessageId] = useState<string>();
  const [peek, setPeek] = useState(false);
  const [task, setTask] = useState<TaskType>();
  const [input, setInput] = useState('');
  const [patientScope, setPatientScope] = useState<string[]>(['all']);
  const [assistantPanelWidth, setAssistantPanelWidth] = useState(400);
  const [assistantResizing, setAssistantResizing] = useState(false);
  const [conversations, setConversations] = useState(() => makeInitialConversations(dayjs().add(1, 'day').format('YYYY年MM月DD日')));
  const [activeKey, setActiveKey] = useState<string>();
  const [pendingKey, setPendingKey] = useState<string>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recordsTab, setRecordsTab] = useState<RecordsTab>('conversations');
  const [conversationView, setConversationView] = useState<ConversationView>('recent');
  const [conversationSource, setConversationSource] = useState<ConversationSource>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [renameKey, setRenameKey] = useState<string>();
  const [renameText, setRenameText] = useState('');
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(() => initialScheduledTasks.map(item => ({ ...item, nextRun: scheduleNextRunLabel(item) })));
  const [scheduleListView, setScheduleListView] = useState<'active' | 'deleted'>('active');
  const [editingSchedule, setEditingSchedule] = useState<string>();
  const [executionScheduleId, setExecutionScheduleId] = useState<string>();
  const [pendingPatientScope, setPendingPatientScope] = useState<string[]>();
  const [briefRequest, setBriefRequest] = useState<BriefRequest>();
  const [patientSearch, setPatientSearch] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [template, setTemplate] = useState<BriefTemplate>({ ...defaultTemplate });
  const [events, setEvents] = useState<string[]>([]);
  const recordEvent = (action: string) => setEvents(previous => [`${new Date().toLocaleTimeString('zh-CN')} · ${action}`, ...previous].slice(0, 100));
  function updateAnswer(id: string, changes: Partial<ChatMessage>) {
    setConversations(previous => previous.map(chat => ({ ...chat, messages: chat.messages.map(item => item.id === id ? { ...item, ...changes } : item) })));
  }
  const [sourceOpen, setSourceOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>();
  const [sharedBrief] = useState<SharePayload | undefined>(() => {
    const value = new URLSearchParams(window.location.search).get('share');
    return value ? decodeSharePayload(value) : undefined;
  });
  const motionEnabled = new URLSearchParams(window.location.search).get('motion') === 'on';
  const scroller = useRef<HTMLDivElement>(null);
  const workAreaBody = useRef<HTMLDivElement>(null);
  const assistantRoot = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const launcherDrag = useRef<LauncherDragState | undefined>(undefined);
  const suppressLauncherClick = useRef(false);
  const sender = useRef<SenderRef>(null);
  const taskRef = useRef<TaskType | undefined>(undefined);
  const composerSelection = useRef<Range | undefined>(undefined);
  const savedScroll = useRef(0);
  const generation = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef<string | undefined>(undefined);
  const speechRecognition = useRef<SpeechRecognitionLike | undefined>(undefined);
  const voiceBaseText = useRef('');
  const voiceListening = useRef(false);
  const [voiceInputState, setVoiceInputState] = useState<'idle' | 'listening'>('idle');
  const current = conversations.find(conversation => conversation.key === activeKey);
  const messages = current?.messages ?? [];
  const latestContext = [...messages].reverse().find(item => item.context)?.context;
  const currentPatient = latestContext?.patientId && latestContext.patientId !== 'all' ? getPatient(latestContext.patientId) : undefined;
  const currentTitle = current?.title && currentPatient ? [`${currentPatient.name}的`, `${currentPatient.name} · `, `${currentPatient.name} `].reduce((title, prefix) => title.startsWith(prefix) ? title.slice(prefix.length) : title, current.title) : current?.title;
  const expanded = panelView === 'large' || panelView === 'split' || panelView === 'task-center';
  const loading = Boolean(pendingKey);

  useEffect(() => () => {
    clearTimeout(generation.current);
    voiceListening.current = false;
    speechRecognition.current?.abort();
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => setViewportHeight(viewport?.height);
    resize();
    viewport?.addEventListener('resize', resize);
    return () => viewport?.removeEventListener('resize', resize);
  }, []);
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = savedScroll.current;
  }, [panelView, peek]);
  useEffect(() => {
    if (!scroller.current) return;
    const last = scroller.current.querySelector('.message-bubble:last-of-type');
    const showAnswerStart = messages.at(-1)?.role === 'ai' && !pendingKey && last instanceof HTMLElement;
    savedScroll.current = showAnswerStart ? scroller.current.scrollTop + last.getBoundingClientRect().top - scroller.current.getBoundingClientRect().top - 16 : messages.length ? scroller.current.scrollHeight : 0;
    scroller.current.scrollTop = savedScroll.current;
  }, [messages.length, pendingKey, activeKey]);

  function changeView(view: PanelView) {
    if (scroller.current?.clientHeight) savedScroll.current = scroller.current.scrollTop;
    if (view !== 'split') setPreviewPayload(undefined);
    if (view !== 'task-center') {
      setHistoryOpen(false);
      setEditingSchedule(undefined);
      setExecutionScheduleId(undefined);
    }
    setPanelView(view);
    setPeek(false);
    requestAnimationFrame(() => {
      if (view === 'closed') launcher.current?.focus({ preventScroll: true });
      else assistantRoot.current?.focus({ preventScroll: true });
    });
  }

  function openAssistantFromLauncher() {
    if (launcherOpening) return;
    setLauncherOpening(true);
    changeView('small');
    window.setTimeout(() => {
      setLauncherOpening(false);
    }, 280);
  }

  function startLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (launcherOpening || panelView !== 'closed' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const bodyRect = workAreaBody.current?.getBoundingClientRect();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    if (!bodyRect) return;
    launcherDrag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: buttonRect.top - bodyRect.top,
      startOffsetY: launcherOffsetY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveLauncher(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = launcherDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.abs(deltaY) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      setLauncherDragging(true);
    }
    const bodyRect = workAreaBody.current?.getBoundingClientRect();
    const buttonHeight = launcher.current?.offsetHeight ?? 174;
    if (!bodyRect) return;
    const minTop = 8;
    const maxTop = Math.max(minTop, bodyRect.height - buttonHeight - 8);
    const nextTop = Math.min(maxTop, Math.max(minTop, drag.startTop + deltaY));
    setLauncherOffsetY(drag.startOffsetY + nextTop - drag.startTop);
    event.preventDefault();
  }

  function stopLauncherDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = launcherDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    launcherDrag.current = undefined;
    setLauncherDragging(false);
    if (drag.moved) {
      suppressLauncherClick.current = true;
      event.preventDefault();
    }
  }

  function handleLauncherClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (suppressLauncherClick.current) {
      suppressLauncherClick.current = false;
      event.preventDefault();
      return;
    }
    openAssistantFromLauncher();
  }

  function getAssistantWidthBounds() {
    const availableWidth = workAreaBody.current?.getBoundingClientRect().width ?? window.innerWidth;
    return {
      min: Math.min(ASSISTANT_PANEL_MIN_WIDTH, Math.max(240, availableWidth - 240)),
      max: Math.min(ASSISTANT_PANEL_MAX_WIDTH, Math.max(ASSISTANT_PANEL_MIN_WIDTH, availableWidth - 240)),
    };
  }

  function setAssistantWidthFromPointer(clientX: number) {
    const bounds = getAssistantWidthBounds();
    const rect = workAreaBody.current?.getBoundingClientRect();
    if (!rect) return;
    setAssistantPanelWidth(Math.round(Math.min(bounds.max, Math.max(bounds.min, rect.right - clientX))));
  }

  function startAssistantResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setAssistantResizing(true);
    setAssistantWidthFromPointer(event.clientX);
  }

  function handleAssistantResizeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const bounds = getAssistantWidthBounds();
    const step = event.shiftKey ? 40 : 16;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setAssistantPanelWidth(width => Math.min(bounds.max, width + step));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setAssistantPanelWidth(width => Math.max(bounds.min, width - step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setAssistantPanelWidth(bounds.min);
    } else if (event.key === 'End') {
      event.preventDefault();
      setAssistantPanelWidth(bounds.max);
    }
  }

  useEffect(() => {
    if (!assistantResizing) return;
    const move = (event: PointerEvent) => setAssistantWidthFromPointer(event.clientX);
    const stop = () => setAssistantResizing(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [assistantResizing]);

  function rememberComposerCursor() {
    const root = sender.current?.inputElement;
    const selection = window.getSelection();
    if (root instanceof HTMLElement && selection?.rangeCount && root.contains(selection.anchorNode)) {
      composerSelection.current = selection.getRangeAt(0).cloneRange();
    }
  }

  function restoreComposerCursor() {
    const root = sender.current?.inputElement;
    const range = composerSelection.current;
    if (!(root instanceof HTMLElement) || !range || !root.contains(range.startContainer)) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    root.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function removeTaskToken() {
    const root = sender.current?.inputElement;
    const token = root instanceof HTMLElement ? root.querySelector<HTMLElement>('[data-slot-key="task"]') : null;
    if (root instanceof HTMLElement && token?.parentNode) {
      const parent = token.parentNode;
      const offset = Array.from(parent.childNodes).indexOf(token);
      token.remove();
      root.focus({ preventScroll: true });
      const range = document.createRange();
      range.setStart(parent, Math.max(0, Math.min(offset, parent.childNodes.length)));
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      composerSelection.current = range.cloneRange();
      root.dispatchEvent(new Event('input', { bubbles: true }));
    }
    taskRef.current = undefined;
    setTask(undefined);
  }

  function createTaskSlot(value: TaskType): SlotConfigType {
    return {
      type: 'custom',
      key: 'task',
      props: { defaultValue: value },
      formatResult: () => '',
      customRender: () => <span className="task-inline-token" data-task={value} title={tasks[value].label}>
        {taskIcons[value]}<span>{tasks[value].label}</span>
        <button type="button" className="task-token-remove" aria-label={`移除${tasks[value].label}标签`} onMouseDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); removeTaskToken(); }}><CloseOutlined /></button>
      </span>,
    };
  }

  function selectTask(value?: TaskType) {
    if (!value) { removeTaskToken(); return; }
    if (value === 'explain' || value === 'communication') {
      const previousPrompt = Object.values(draftTaskPrompts).find(prompt => input.startsWith(prompt.trimEnd()));
      const draft = previousPrompt ? input.slice(previousPrompt.trimEnd().length).trimStart() : input;
      removeTaskToken();
      sender.current?.clear();
      composerSelection.current = undefined;
      const promptText = `${draftTaskPrompts[value]}${draft}`;
      setInput(promptText);
      sender.current?.insert([{ type: 'text', value: promptText }], 'start', undefined, true);
      requestAnimationFrame(() => sender.current?.focus({ cursor: 'end', preventScroll: true }));
      return;
    }
    if (value === 'admission' && !patientScope.length) setPatientScope(['all']);
    const root = sender.current?.inputElement;
    const existing = root instanceof HTMLElement ? root.querySelector<HTMLElement>('[data-slot-key="task"]') : null;
    if (root instanceof HTMLElement && existing) {
      const range = document.createRange();
      range.setStartBefore(existing);
      range.collapse(true);
      existing.remove();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else if (!restoreComposerCursor()) {
      sender.current?.focus({ cursor: 'end', preventScroll: true });
    }
    taskRef.current = value;
    setTask(value);
    sender.current?.insert([createTaskSlot(value)], 'cursor', undefined, true);
    if (value === 'admission' && !/入院时间\s*[:：]/.test(input)) {
      sender.current?.insert([{ type: 'text', value: `${input.trim() ? '\n' : ''}${tasks.admission.question}` }], 'end', undefined, true);
    }
  }

  function resetComposer(preserveTask?: TaskType) {
    sender.current?.clear();
    composerSelection.current = undefined;
    taskRef.current = undefined;
    setTask(preserveTask);
    setInput('');
    if (preserveTask) {
      taskRef.current = preserveTask;
      sender.current?.insert([createTaskSlot(preserveTask)], 'start', undefined, true);
      if (preserveTask === 'admission') sender.current?.insert([{ type: 'text', value: tasks.admission.question }], 'end', undefined, true);
    }
  }

  function handleSenderChange(value: string, _event?: unknown, slots: SlotConfigType[] = []) {
    setInput(value);
    if (!slots.some(slot => 'key' in slot && slot.key === 'task') && taskRef.current) {
      taskRef.current = undefined;
      setTask(undefined);
    }
  }

  function stopVoiceInput() {
    voiceListening.current = false;
    speechRecognition.current?.stop();
    setVoiceInputState('idle');
  }

  function fillFollowUpQuestion(question: FollowUpQuestion) {
    if (pending.current) return;
    const fill = () => {
      resetComposer();
      setBriefRequest(undefined);
      const plainPrompt = question.task === 'explain' || question.task === 'communication';
      if (!plainPrompt) {
        taskRef.current = question.task;
        setTask(question.task);
      }
      setInput(question.prompt);
      sender.current?.insert([
        ...(!plainPrompt ? [createTaskSlot(question.task)] : []),
        { type: 'text', value: question.prompt },
      ], 'start', undefined, true);
      sender.current?.focus({ cursor: 'end', preventScroll: true });
    };
    if (input.trim() && input.trim() !== question.prompt.trim()) {
      modal.confirm({ title: '替换当前输入？', content: '输入框中已有内容。选择该问题会替换当前草稿，不会自动发送。', okText: '替换', cancelText: '取消', onOk: fill });
    } else fill();
  }

  function cancelVoiceInput() {
    const recognition = speechRecognition.current;
    voiceListening.current = false;
    speechRecognition.current = undefined;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    }
    setInput(voiceBaseText.current);
    setVoiceInputState('idle');
    requestAnimationFrame(() => sender.current?.focus({ cursor: 'end', preventScroll: true }));
  }

  function startVoiceInput() {
    if (voiceInputState === 'listening') {
      stopVoiceInput();
      return;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      message.info('当前浏览器暂不支持语音输入，请使用 Chrome 或 Edge。');
      return;
    }
    const recognition = new Recognition();
    voiceBaseText.current = input.trim();
    voiceListening.current = true;
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index]?.[0]?.transcript ?? '';
      const base = voiceBaseText.current;
      setInput(`${base}${base && transcript ? ' ' : ''}${transcript}`.trim());
    };
    recognition.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        voiceListening.current = false;
        setVoiceInputState('idle');
        message.warning('请允许浏览器访问麦克风后再试。');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        voiceListening.current = false;
        setVoiceInputState('idle');
        message.warning('语音输入暂时不可用，请再试一次。');
      }
    };
    recognition.onend = () => {
      if (speechRecognition.current !== recognition) return;
      if (voiceListening.current) {
        window.setTimeout(() => {
          if (!voiceListening.current || speechRecognition.current !== recognition) return;
          try {
            recognition.start();
          } catch {
            voiceListening.current = false;
            speechRecognition.current = undefined;
            setVoiceInputState('idle');
            message.warning('语音输入已结束，请再试一次。');
          }
        }, 160);
        return;
      }
      speechRecognition.current = undefined;
      setVoiceInputState('idle');
    };
    speechRecognition.current = recognition;
    setVoiceInputState('listening');
    try {
      recognition.start();
    } catch {
      voiceListening.current = false;
      speechRecognition.current = undefined;
      setVoiceInputState('idle');
      message.warning('无法启动麦克风，请检查浏览器权限。');
    }
  }

  function newChat(keepTaskCenterOpen = false, options?: { patientScope?: string[]; task?: TaskType }) {
    setActiveKey(undefined);
    setPatientScope(options?.patientScope ?? ['all']);
    resetComposer(options?.task);
    const keepTaskCenter = keepTaskCenterOpen && panelView === 'task-center';
    setHistoryOpen(keepTaskCenter);
    setHistorySearch('');
    if (panelView === 'split') { setDetail(undefined); changeView('large'); }
    if (panelView === 'task-center' && !keepTaskCenter) changeView('large');
  }

  function cancelGeneration() {
    clearTimeout(generation.current);
    const key = pending.current;
    if (key) setConversations(previous => previous.map(chat => chat.key === key ? { ...chat, messages: [...chat.messages, { id: crypto.randomUUID(), role: 'ai', content: '已停止生成。' }] } : chat));
    pending.current = undefined;
    setPendingKey(undefined);
  }

  function generate(text: string, selectedTask?: TaskType, context?: QueryContext, forceNewConversation = false) {
    if (!text.trim() || pending.current) return;
    setBriefRequest(undefined);
    const key = forceNewConversation || !activeKey ? crypto.randomUUID() : activeKey;
    const appendToCurrent = Boolean(activeKey && !forceNewConversation);
    const patient = context?.patientId && context.patientId !== 'all' ? getPatient(context.patientId) : undefined;
    const question: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text.trim(), task: selectedTask, context };
    setConversations(previous => appendToCurrent
      ? previous.map(chat => chat.key === key ? { ...chat, messages: [...chat.messages, question] } : chat)
      : [{ key, title: patient ? `${patient.name} · ${selectedTask ? tasks[selectedTask].label : '患者任务'}` : text.trim(), group: '今天', source: 'manual', updatedLabel: '刚刚', messages: [question] }, ...previous]);
    setActiveKey(key);
    resetComposer();
    recordEvent(`生成${selectedTask ? tasks[selectedTask].label : '回答'}`);
    pending.current = key;
    setPendingKey(key);
    generation.current = setTimeout(() => {
      const answer: ChatMessage = { id: crypto.randomUUID(), role: 'ai', task: selectedTask, context, ...buildDemoReply(selectedTask, context, text) };
      setConversations(previous => previous.map(chat => chat.key === key ? { ...chat, messages: [...chat.messages, answer] } : chat));
      pending.current = undefined;
      setPendingKey(undefined);
    }, 1000);
  }

  function generateAdmissionBriefNow(text: string, forceNewConversation: boolean, scope = patientScope) {
    const date = resolveAdmissionDate(text);
    if (!date) {
      message.info('请填写有效的入院时间，例如【入院时间：2026-10-20】');
      sender.current?.focus({ cursor: 'end', preventScroll: true });
      return;
    }
    const selectedIds = scope.includes('all') ? [] : scope;
    const context = selectedIds.length ? buildBriefScopeContext('admission', selectedIds) : buildBriefContext('admission', 'all');
    generate(text, 'admission', { ...context, date }, forceNewConversation);
  }

  function generateAdmissionBrief(text: string, scope = patientScope) {
    if (!scope.length) {
      message.info('请先选择患者范围');
      return;
    }
    const forceNewConversation = messages.length > 0 && !samePatientScope(conversationPatientScope(current), scope);
    if (forceNewConversation) {
      modal.confirm({
        title: '确认切换范围并新建任务？',
        content: '患者范围与当前任务不同。新任务将使用所选患者范围和填写的入院日期，当前任务会保留在任务记录中。',
        okText: '确认生成',
        cancelText: '取消',
        onOk: () => generateAdmissionBriefNow(text, true, scope),
      });
      return;
    }
    generateAdmissionBriefNow(text, false, scope);
  }

  function beginBrief(selectedTask: BriefType, text: string, patientId?: string) {
    if (selectedTask === 'admission') {
      generateAdmissionBrief(text);
      return;
    }
    const context = buildBriefContext(selectedTask, patientId);
    if (patientId) {
      setPatientScope([patientId]);
      generate(text, selectedTask, context);
      return;
    }
    setPatientSearch('');
    setBriefRequest({ task: selectedTask, text, context });
  }

  function buildBriefContext(selectedTask: BriefType, patientId?: string): QueryContext {
    const selectedDefault = getDefaultTemplate(selectedTask);
    const hasGlobalDefault = template.fields.length === defaultTemplate.fields.length && template.fields.every((field, index) => field === defaultTemplate.fields[index]) && !template.focus;
    const activeTemplate = selectedTask === 'admission' || !hasGlobalDefault ? template : selectedDefault;
    return {
      patientId: selectedTask === 'admission' ? 'all' : (patientId ?? ''),
      template: { ...activeTemplate, fields: [...(activeTemplate.fields.length ? activeTemplate.fields : selectedDefault.fields)] },
      ...(selectedTask === 'admission' ? { date: dayjs().add(1, 'day').format('YYYY年MM月DD日') } : {}),
    };
  }

  function buildBriefScopeContext(selectedTask: BriefType, patientIds: string[]): QueryContext {
    const context = buildBriefContext(selectedTask, patientIds.length === 1 ? patientIds[0] : 'all');
    return selectedTask === 'admission' || patientIds.length > 1 ? { ...context, patientId: 'all', patientIds } : context;
  }

  function contextForPatientScope(scope: string[]): QueryContext | undefined {
    if (scope.includes('all') || scope.length === 0) return undefined;
    return scope.length === 1 ? { patientId: scope[0] } : { patientId: 'all', patientIds: scope };
  }

  function submitBriefTask(selectedTask: BriefType) {
    if (selectedTask === 'admission') {
      generateAdmissionBrief(input.trim() || tasks[selectedTask].question);
      return;
    }
    const selectedIds = patientScope.includes('all') ? [] : patientScope;
    if (!patientScope.length) {
      message.info('请先选择患者范围');
      return;
    }
    if (selectedIds.length > 1) {
      generate(tasks[selectedTask].question, selectedTask, buildBriefScopeContext(selectedTask, selectedIds));
      return;
    }
    const contextPatientId = selectedIds.length === 1 ? selectedIds[0] : businessDetail?.patientId;
    const patient = contextPatientId ? getPatient(contextPatientId) : undefined;
    if (patient) {
      beginBrief(selectedTask, tasks[selectedTask].question, patient.id);
    } else {
      const key = activeKey ?? crypto.randomUUID();
      const question: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: tasks[selectedTask].question, task: selectedTask };
      const ask: ChatMessage = { id: crypto.randomUUID(), role: 'ai', content: '可以，请先选择需要生成简报的患者。', task: selectedTask, evidence: 'input' };
      setConversations(previous => activeKey ? previous.map(chat => chat.key === key ? { ...chat, messages: [...chat.messages, question, ask] } : chat) : [{ key, title: tasks[selectedTask].label, group: '今天', source: 'manual', updatedLabel: '刚刚', messages: [question, ask] }, ...previous]);
      setActiveKey(key);
      setBriefRequest({ task: selectedTask, text: tasks[selectedTask].question, context: { patientId: '', template: getDefaultTemplate(selectedTask) } });
      resetComposer();
    }
  }

  function chooseBriefPatient(patientId: string) {
    if (!briefRequest || loading) return;
    const context = { ...briefRequest.context, patientId };
    const forceNewConversation = messages.length > 0 && latestContext?.patientId !== context.patientId;
    setPatientScope([context.patientId]);
    generate(briefRequest.text, briefRequest.task, context, forceNewConversation);
  }

  function submit(text: string, selectedTask = task) {
    if (pending.current) return;
    const question = text.trim() || (selectedTask ? tasks[selectedTask].question : '');
    if (!question) return;
    const intent = selectedTask ?? detectIntent(question);
    if (intent === 'admission') generateAdmissionBrief(question, selectedTask ? patientScope : ['all']);
    else if (isBriefTask(intent)) {
      const selectedIds = !selectedTask || patientScope.includes('all') ? [] : patientScope;
      if (selectedIds.length > 1) generate(question, intent, buildBriefScopeContext(intent, selectedIds));
      else beginBrief(intent, question, selectedIds[0] ?? (selectedTask ? businessDetail?.patientId : undefined));
    } else generate(question, intent, !selectedTask || intent === 'knowledge' || intent === 'product' ? undefined : contextForPatientScope(patientScope));
  }

  function startPatientBrief(patientId?: string, brief: BriefType = 'call') {
    if (loading) { message.info('请等待当前生成完成，或先停止生成。'); return; }
    if (panelView === 'closed') changeView('small');
    if (panelView === 'split') setPeek(true);
    if (brief === 'admission') {
      if (patientId) setPatientScope([patientId]);
      requestAnimationFrame(() => selectTask('admission'));
      return;
    }
    taskRef.current = brief;
    setTask(brief);
    beginBrief(brief, tasks[brief].question, patientId);
  }

  function openLinkedDetail(target: DetailTarget, messageId: string) {
    openPatientPlatform(target);
    setSourceMessageId(messageId);
  }

  function openSourceRecord(source: SourceRecord, messageId: string) {
    if (!source.target) return;
    openPatientPlatform(source.target);
    setSourceMessageId(messageId);
  }

  function openPatientPlatform(target: DetailTarget) {
    setPage('patients');
    setBusinessDetail(target);
    setDetail(undefined);
    setPeek(false);
    changeView('small');
  }

  function openBriefPreview(item: ChatMessage) {
    if (item.task !== 'admission' || !item.context) return;
    setPreviewPayload({
      title: tasks.admission.label,
      task: 'admission',
      patientLabel: scopeLabel(item.context) || '计划入院患者',
      date: item.context.date,
      content: item.content,
      sections: item.sections,
      createdAt: item.updatedAt ?? new Date().toLocaleString('zh-CN'),
      edited: item.edited,
    });
    setDetail(undefined);
    setPeek(false);
    changeView('split');
  }

  function closeBriefPreview() {
    setPreviewPayload(undefined);
    changeView('large');
  }

  function applyPatientScopeChange(nextScope: string[]) {
    if ((messages.length > 0 || input.trim()) && !samePatientScope(conversationPatientScope(current), nextScope)) {
      newChat(false, { patientScope: nextScope, task });
    } else {
      setPatientScope(nextScope);
    }
    setPendingPatientScope(undefined);
  }

  function handlePatientScopeChange(nextScope: string[]) {
    if (samePatientScope(nextScope, patientScope)) return;
    if (loading) {
      message.info('请等待当前生成完成，或先停止生成。');
      return;
    }
    if (messages.length > 0 || input.trim()) {
      setPendingPatientScope(nextScope);
      return;
    }
    applyPatientScopeChange(nextScope);
  }

  function selectConversation(key: string) {
    const conversation = conversations.find(item => item.key === key);
    setActiveKey(key);
    setPatientScope(conversationPatientScope(conversation));
    resetComposer();
    if (panelView === 'task-center') {
      setHistoryOpen(true);
      return;
    }
    setHistoryOpen(false);
    if (panelView === 'split') { setDetail(undefined); changeView('large'); }
  }

  function openTaskCenter() {
    if (panelView === 'small' || panelView === 'large' || panelView === 'split') setTaskCenterReturnView(panelView);
    setRecordsTab('conversations');
    setEditingSchedule(undefined);
    setExecutionScheduleId(undefined);
    setHistoryOpen(true);
    changeView('task-center');
  }

  function closeTaskCenter() {
    setHistoryOpen(false);
    setEditingSchedule(undefined);
    setExecutionScheduleId(undefined);
    changeView(taskCenterReturnView);
  }

  function deleteConversation(chat: Conversation) {
    modal.confirm({ title: '删除这个任务？', content: `“${chat.title}”将从当前任务中移除。`, okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => {
      if (pending.current === chat.key) cancelGeneration();
      setConversations(previous => previous.filter(item => item.key !== chat.key));
      if (activeKey === chat.key) newChat();
    } });
  }

  function saveScheduledTask(draft: ScheduleDraft) {
    const nextRun = scheduleNextRunLabel(draft);
    const creating = editingSchedule === 'new';
    setScheduledTasks(previous => creating
      ? [{ ...draft, id: crypto.randomUUID(), nextRun, runs: [] }, ...previous]
      : previous.map(item => item.id === editingSchedule ? { ...item, ...draft, nextRun } : item));
    message.success(creating ? '定时任务已创建' : '定时任务已更新');
    setScheduleListView('active');
    setEditingSchedule(undefined);
  }

  function deleteScheduledTask(schedule: ScheduledTask) {
    modal.confirm({
      title: '删除这个定时任务？',
      content: `删除“${schedule.name}”后停止后续执行。已生成的简报仍在任务记录中，运行记录可在“已删除”中查看。`,
      okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: () => setScheduledTasks(previous => previous.map(item => item.id === schedule.id
        ? { ...item, enabled: false, deletedAt: new Date().toLocaleString('zh-CN'), nextRun: '已删除' }
        : item)),
    });
  }

  function finishScheduledRun(schedule: ScheduledTask, runs: ScheduleRun[]) {
    const completed = schedule.repeat === 'once' && runs[0].status !== 'failed';
    setScheduledTasks(previous => previous.map(item => item.id === schedule.id ? {
      ...item, enabled: completed ? false : item.enabled, lastRun: runs[0],
      nextRun: completed ? '已完成' : scheduleNextRunLabel(item),
      runs: [...runs, ...item.runs],
    } : item));
  }

  function runScheduledTask(schedule: ScheduledTask) {
    if (!schedule.enabled || schedule.deletedAt) return;
    const now = dayjs();
    const admissionDate = schedule.type === 'admission' ? scheduleAdmissionDate(schedule, now.toDate()) : undefined;
    if (schedule.type === 'admission' && !admissionDate) {
      message.error('请先设置有效的入院日期');
      return;
    }
    const selectedGroups = schedule.scope.includes('all') ? [] : schedule.scope;
    const patients = demoPatients.filter(item =>
      (!selectedGroups.length || selectedGroups.includes(item.treatmentGroup)) &&
      (schedule.type !== 'admission' || item.admission),
    );
    if (!patients.length) {
      const skipped: ScheduleRun = { id: crypto.randomUUID(), time: `今天 ${now.format('HH:mm')}`, status: 'skipped', detail: '所选治疗组内没有符合条件的患者' };
      finishScheduledRun(schedule, [skipped]);
      message.info(skipped.detail);
      return;
    }
    const question = schedule.type === 'admission'
      ? `汇总【入院时间：${admissionDate}】计划入院患者的准备情况。`
      : tasks[schedule.type].question;
    const targets = schedule.type === 'call' ? patients.map(patient => ({ patient, group: '' }))
      : schedule.aggregation === 'group' ? [...new Set(patients.map(patient => patient.treatmentGroup))].map(group => ({ patient: undefined, group }))
      : [{ patient: undefined, group: '' }];
    const generated = targets.map(({ patient, group }) => {
      const key = crypto.randomUUID();
      const context = schedule.type === 'call'
        ? buildBriefContext('call', patient!.id)
        : { ...buildBriefContext('admission', 'all'), date: admissionDate, treatmentGroups: group ? [group] : selectedGroups };
      const title = schedule.type === 'call' ? `${patient!.name} · ${schedule.name}` : `${schedule.name} · ${admissionDate}${group ? ` · ${group}` : ''}`;
      const answer: ChatMessage = { id: crypto.randomUUID(), role: 'ai', task: schedule.type, context, ...buildDemoReply(schedule.type, context, question) };
      const conversation: Conversation = {
        key, title, group: '今天', source: 'automatic', automationId: schedule.id, updatedLabel: '刚刚',
        messages: [{ id: crypto.randomUUID(), role: 'user', content: question, task: schedule.type, context }, answer],
      };
      const run: ScheduleRun = { id: crypto.randomUUID(), time: `今天 ${now.format('HH:mm')}`, status: 'success', detail: `${title}已生成`, conversationKey: key };
      return { conversation, run };
    });
    setConversations(previous => [...generated.map(item => item.conversation), ...previous]);
    finishScheduledRun(schedule, generated.map(result => result.run));
    message.success(`已生成 ${generated.length} 份${schedule.name}，可在任务记录中查看`);
  }

  function toggleScheduledTask(id: string, enabled: boolean) {
    const schedule = scheduledTasks.find(item => item.id === id && !item.deletedAt);
    if (!schedule) return;
    if (enabled && !nextScheduleExecution(schedule)) {
      message.info('执行时间已过，请先编辑执行日期和时间');
      return;
    }
    setScheduledTasks(previous => previous.map(item => item.id === id ? {
      ...item,
      enabled,
      nextRun: scheduleNextRunLabel({ ...item, enabled }),
    } : item));
  }

  const commonTasks: { text: string; task: TaskType }[] = [
    { text: '生成呼叫前简报', task: 'call' }, { text: '生成入院简报', task: 'admission' }, { text: '整理患者情况总结', task: 'summary' },
    { text: '用通俗语言解释', task: 'explain' }, { text: '制定患者沟通策略', task: 'communication' },
  ];
  const exampleQuestions: { text: string; task: 'knowledge' | 'product' }[] = task === 'knowledge' ? [
    { text: '入院准备需要核对哪些资料？', task: 'knowledge' }, { text: '如何核对简报中的缺失信息？', task: 'knowledge' },
  ] : task === 'product' ? productHelp.map(item => ({ text: item.question, task: 'product' })) : [];
  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredConversations = conversations.filter(chat => {
    const patientId = conversationPatientId(chat);
    const patient = patientId && patientId !== 'all' ? getPatient(patientId) : undefined;
    const matchesSource = conversationSource === 'all' || (chat.source ?? 'manual') === conversationSource;
    const searchText = `${chat.title}${patient?.name ?? ''}${patientId ?? ''}${patientId === 'all' ? '多患者批量简报' : patientId ? '' : '未关联患者'}`.toLowerCase();
    return matchesSource && (!normalizedHistorySearch || searchText.includes(normalizedHistorySearch));
  });
  const recentConversationGroups = Array.from(filteredConversations.reduce((groups, chat) => {
    const list = groups.get(chat.group) ?? [];
    list.push(chat);
    groups.set(chat.group, list);
    return groups;
  }, new Map<string, Conversation[]>()));
  const patientConversationGroups = Array.from(filteredConversations.reduce((groups, chat) => {
    const patientId = conversationPatientId(chat);
    const key = patientId === 'all' ? 'batch' : patientId || 'unassigned';
    const list = groups.get(key) ?? [];
    list.push(chat);
    groups.set(key, list);
    return groups;
  }, new Map<string, Conversation[]>()));
  const visibleSchedules = scheduledTasks.filter(item => scheduleListView === 'deleted' ? Boolean(item.deletedAt) : !item.deletedAt);
  const hasScheduleFailure = scheduledTasks.some(item => !item.deletedAt && item.lastRun?.status === 'failed');
  const executionSchedule = executionScheduleId ? scheduledTasks.find(item => item.id === executionScheduleId) : undefined;
  const canSend = Boolean(input.trim() || (task && tasks[task].question));

  if (sharedBrief) return <SharedBriefPage payload={sharedBrief} />;
  return <div className={`case-app${motionEnabled ? ' motion-enabled' : ''}`} style={viewportHeight ? { height: viewportHeight } : undefined}>
    <nav className="app-rail" aria-label="工作台导航">
      <img className="brand-logo" src="/favicon.svg" alt="海心" /><span className="rail-brand">海心</span>
      <div className="rail-items">{navItems.map(item => <button key={item.key} className={`rail-item ${page === item.key ? 'rail-active' : ''}`} aria-current={page === item.key ? 'page' : undefined} onClick={() => {
        setPage(item.key); setBusinessDetail(undefined);
        if (expanded) changeView('small');
      }}>{item.icon}<span>{item.label}</span></button>)}</div>
      <div className="rail-footer"><IconButton label="帮助与说明" icon={<QuestionCircleOutlined />} onClick={() => setHelpOpen(true)} /><Avatar className="user-avatar" icon={<UserOutlined />} /></div>
    </nav>

    <div className="work-area">
      <div ref={workAreaBody} className={`work-area-body assistant-layout-${panelView} ${assistantResizing ? 'assistant-resizing' : ''} ${launcherOpening ? 'assistant-opening' : ''}`} style={{ '--assistant-panel-width': `${assistantPanelWidth}px` } as CSSProperties}>
        <main className="business-workspace" hidden={expanded}>
          <div className={businessDetail ? 'base-list base-list-hidden' : 'base-list'}><BusinessWorkspace page={page} onDetail={openPatientPlatform} onBrief={startPatientBrief} onNavigate={setPage} onAssistant={(value) => { changeView('small'); requestAnimationFrame(() => selectTask(value)); }} onSettings={() => setSettingsOpen(true)} /></div>
          {businessDetail && <PatientDetail target={businessDetail} onBack={() => setBusinessDetail(undefined)} onBrief={startPatientBrief} />}
        </main>
        {(panelView === 'closed' || launcherOpening) && <button ref={launcher} className={`assistant-launcher${launcherOpening ? ' is-opening' : ''}${launcherDragging ? ' is-dragging' : ''}`} style={{ '--launcher-offset-y': `${launcherOffsetY}px` } as CSSProperties} aria-label="打开 CARES 个案助手" aria-expanded={launcherOpening} aria-controls="assistant-panel" onPointerDown={startLauncherDrag} onPointerMove={moveLauncher} onPointerUp={stopLauncherDrag} onPointerCancel={stopLauncherDrag} onClick={handleLauncherClick}><AssistantLauncherMascot /></button>}

        <div className={`assistant-stage view-${panelView} ${peek ? 'assistant-peek' : ''} ${previewPayload ? 'assistant-web-preview' : ''}`}>
          {panelView === 'small' && <button className="assistant-drawer-backdrop" aria-label="关闭助手" onClick={() => changeView('closed')} />}
          {panelView === 'split' && peek && <button className="peek-backdrop" aria-label="收起对话，查看详情" onClick={() => setPeek(false)} />}
          <section id="assistant-panel" ref={assistantRoot} tabIndex={-1} className="assistant-pane" aria-label="CARES 个案助手" onKeyDown={event => { if (event.key === 'Escape' && !briefRequest) { event.stopPropagation(); if (historyOpen) closeTaskCenter(); else changeView('closed'); } }}>
            {panelView === 'small' && <div className="assistant-resize-handle" role="separator" aria-orientation="vertical" aria-label="调整个案助手宽度" aria-valuemin={getAssistantWidthBounds().min} aria-valuemax={getAssistantWidthBounds().max} aria-valuenow={assistantPanelWidth} aria-valuetext={`${assistantPanelWidth} 像素`} tabIndex={0} onPointerDown={startAssistantResize} onKeyDown={handleAssistantResizeKeyDown}><span aria-hidden="true" /></div>}
            <header className="assistant-header"><div className="assistant-heading"><div className="cares-mark" aria-label="CARES"><Mascot /><span>CARES</span></div><h2>个案助手</h2></div><div className="assistant-tools">
              <IconButton label="新建任务" icon={<NewTaskIcon />} onClick={() => newChat(true)} />
              <IconButton label="任务中心" icon={<Badge dot={hasScheduleFailure} offset={[2, 0]}><HistoryOutlined /></Badge>} onClick={openTaskCenter} />
              <IconButton label={panelView === 'small' ? '展开大面板' : panelView === 'task-center' ? '返回工作台' : '收起为小面板'} icon={panelView === 'small' ? <FullscreenOutlined /> : <FullscreenExitOutlined />} onClick={() => panelView === 'task-center' ? closeTaskCenter() : changeView(panelView === 'small' ? 'large' : 'small')} />
              <span className="assistant-tool-divider" aria-hidden="true" />
              <IconButton className="assistant-close-button" label={panelView === 'split' && previewPayload ? '关闭网页预览' : panelView === 'split' && peek ? '收起对话' : '关闭助手'} icon={<FigmaIcon name="8affd" />} onClick={() => panelView === 'split' && previewPayload ? closeBriefPreview() : panelView === 'split' && peek ? setPeek(false) : changeView('closed')} />
            </div></header>
            {messages.length > 0 && <div className="conversation-heading"><span title={currentTitle}>{currentTitle}</span>{latestContext && <Tag>{scopeLabel(latestContext)}</Tag>}</div>}
            <div className="assistant-scroll" ref={scroller}>
              {messages.length === 0 ? <div className="assistant-welcome chat-width">
                <div className="welcome-intro"><Mascot className="welcome-mascot" /><Welcome className="welcome" variant="borderless" title="你好，我是CARES" description="有什么需要帮忙的吗？" /></div>
                <div className="suggestion-heading">常用管案任务</div>
                <Prompts vertical className="suggestion-prompts" items={commonTasks.map(item => ({ key: item.task, label: <button className="prompt-label" onClick={() => selectTask(item.task)}><span className="prompt-icon">{taskIcons[item.task]}</span><span>{item.text}</span><ArrowRightOutlined /></button> }))} />
                {exampleQuestions.length > 0 && <section className="example-questions" aria-label="你可以这样问"><div className="suggestion-heading">你可以这样问</div><div className="example-question-list">{exampleQuestions.map(item => <Button type="text" key={item.text} onClick={() => {
                  resetComposer(item.task);
                  setInput(item.text);
                  sender.current?.insert([{ type: 'text', value: item.text }], 'end', undefined, true);
                  sender.current?.focus({ cursor: 'end', preventScroll: true });
                }}>{item.text}</Button>)}</div></section>}
              </div> : <div className="message-list chat-width" aria-live="polite" aria-busy={pendingKey === activeKey}>
                {messages.map((item, index) => <Bubble key={item.id} className={`message-bubble message-${item.role}${item.role === 'ai' && item.task === 'admission' ? ' message-admission' : ''}`} placement={item.role === 'user' ? 'end' : 'start'} variant={item.role === 'ai' ? 'borderless' : 'filled'} avatar={item.role === 'ai' ? <Mascot /> : undefined} header={item.role === 'ai' ? <span className="message-author"><Mascot /><span className="message-author-name">CARES</span></span> : item.task ? <span className="message-task">{taskIcons[item.task]} {tasks[item.task].label}</span> : undefined} content={item.role === 'ai' ? <AnswerContent item={item} onPatientDetail={patientId => { const link = item.links?.find(candidate => candidate.patientId === patientId); if (link) openLinkedDetail(link, item.id); }} /> : item.content} footer={item.role === 'ai' ? <div className="answer-footer">
                  {item.task !== 'admission' && item.links && <div className="record-links">{item.links.map(link => <Button key={`${link.kind}-${link.patientId}`} className={sourceMessageId === item.id && detail?.patientId === link.patientId && detail.kind === link.kind && panelView === 'split' ? 'record-link selected' : 'record-link'} onClick={() => openLinkedDetail(link, item.id)}>{link.label}<ArrowRightOutlined /></Button>)}</div>}
                  <AnswerActions item={item} previousQuestion={messages.slice(0, index).reverse().find(message => message.role === 'user')?.content} loading={loading} onUpdate={changes => updateAnswer(item.id, changes)} onEvent={recordEvent} onRecommend={fillFollowUpQuestion} onPreview={() => openBriefPreview(item)} onSource={source => openSourceRecord(source, item.id)} />
                </div> : undefined} />)}
                {pendingKey === activeKey && <Bubble className="message-bubble message-ai" content="" loading header={<span className="message-author"><Mascot /><span>正在整理信息…</span></span>} />}
              </div>}
            </div>

            <div className="composer-band"><div className="chat-width">
              {briefRequest && <BriefPatientPanel briefRequest={briefRequest} patientSearch={patientSearch} setPatientSearch={setPatientSearch} onChoose={chooseBriefPatient} onClose={() => setBriefRequest(undefined)} />}
              <div className="task-toolbar" onMouseDownCapture={rememberComposerCursor}><Button type="text" icon={taskIcons.knowledge} aria-pressed={task === 'knowledge'} onClick={() => selectTask('knowledge')}>医学知识</Button><Dropdown trigger={['click']} menu={{ className: 'task-menu', selectable: true, selectedKeys: task ? [task] : [], items: briefTypes.map(key => ({ key, label: tasks[key].label, icon: taskIcons[key] })), onClick: ({ key }) => { const brief = key as BriefType; selectTask(brief); if (brief !== 'admission') setInput(tasks[brief].question); } }}><Button type="text" icon={taskIcons.summary} aria-label="选择简报类型" aria-pressed={isBriefTask(task)}>简报<FigmaIcon name="d364b" /></Button></Dropdown><Button type="text" icon={taskIcons.product} aria-pressed={task === 'product'} onClick={() => selectTask('product')}>产品功能解答</Button></div>
              <Sender ref={sender} className="message-sender" value={input} slotConfig={emptySlotConfig} onBlur={rememberComposerCursor} onChange={handleSenderChange} onSubmit={text => submit(text)} onCancel={cancelGeneration} loading={loading} autoSize={{ minRows: 2, maxRows: 4 }} placeholder={task ? tasks[task].placeholder : '请输入你的问题...'} suffix={false} components={{ input: AccessibleInput }} footer={<div className="sender-footer">{!task || task === 'knowledge' || task === 'product'
                ? <span className="patient-scope-static">不读取患者资料</span>
                : <PatientScopePicker value={patientScope} onChange={handlePatientScopeChange} confirmOpen={Boolean(pendingPatientScope)} confirmDescription={messages.length > 0 && input.trim() ? '切换患者将创建新任务，并带入当前患者选择。当前任务会保留在任务记录中，未发送内容将被清空。' : messages.length > 0 ? '切换患者将创建新任务，并带入当前患者选择。当前任务会保留在任务记录中。' : '切换患者将创建新任务，并带入当前患者选择。未发送内容将被清空。'} onConfirm={() => pendingPatientScope && applyPatientScopeChange(pendingPatientScope)} onCancel={() => setPendingPatientScope(undefined)} />}
                <div className="sender-actions">{voiceInputState === 'listening' && <><span className="voice-status" aria-live="polite">正在聆听…</span><Tooltip title="取消语音输入"><Button type="text" className="voice-cancel-button" icon={<CloseOutlined />} aria-label="取消语音输入" onClick={cancelVoiceInput} /></Tooltip></>}<Tooltip title={voiceInputState === 'listening' ? '停止并保留文字' : '语音输入'}><Button type="text" className={`voice-button${voiceInputState === 'listening' ? ' voice-button-listening' : ''}`} icon={voiceInputState === 'listening' ? <span className="voice-stop-icon" aria-hidden="true" /> : <AudioOutlined />} aria-label={voiceInputState === 'listening' ? '停止语音输入并保留文字' : '语音输入'} aria-pressed={voiceInputState === 'listening'} disabled={loading && voiceInputState !== 'listening'} onClick={voiceInputState === 'listening' ? stopVoiceInput : startVoiceInput} /></Tooltip><Button type="primary" className="send-button" icon={loading ? <span className="voice-stop-icon" aria-hidden="true" /> : <FigmaIcon name="caa0c" />} aria-label={loading ? '停止生成' : '发送问题'} disabled={!loading && !canSend} onClick={() => loading ? cancelGeneration() : (isBriefTask(task) ? submitBriefTask(task) : submit(input))} /></div></div>} />
              <p className="disclaimer">未接入 AI 与真实业务数据 · 请勿输入真实患者信息</p>
            </div></div>
          </section>
          {panelView === 'split' && previewPayload && <BriefPreviewPane payload={previewPayload} onClose={closeBriefPreview} />}
          {panelView === 'split' && !previewPayload && detail && <PatientDetail key={detail.patientId} target={detail} onBack={() => { setDetail(undefined); changeView('large'); }} onBrief={startPatientBrief} />}
        </div>
      </div>
    </div>

    {historyOpen && panelView === 'task-center' && <aside className="task-center-panel records-drawer" aria-label="任务中心">
      <header className="task-center-header"><div className="task-center-header-leading">{(executionSchedule || editingSchedule) && <Button type="text" aria-label="返回定时任务" icon={<ArrowLeftOutlined />} onClick={() => executionSchedule ? setExecutionScheduleId(undefined) : setEditingSchedule(undefined)} />}<h2>{executionSchedule?.name ?? (editingSchedule === 'new' ? '新建定时任务' : editingSchedule ? '编辑定时任务' : '任务中心')}</h2></div><Button type="text" className="assistant-close-button" aria-label="返回工作台" icon={<FigmaIcon name="8affd" />} onClick={closeTaskCenter} /></header>
      {executionSchedule ? <ScheduleRunsPanel schedule={executionSchedule} onSelectConversation={selectConversation} /> : editingSchedule ? <ScheduleTaskEditor
        key={editingSchedule}
        task={editingSchedule === 'new' ? undefined : scheduledTasks.find(item => item.id === editingSchedule)}
        onBack={() => setEditingSchedule(undefined)}
        onSave={saveScheduledTask}
      /> : <Tabs className="records-tabs" activeKey={recordsTab} onChange={key => setRecordsTab(key as RecordsTab)} items={[
        {
          key: 'conversations', label: '任务记录', children: <div className="conversation-records">
            <Button block icon={<NewTaskIcon />} onClick={() => newChat(true)}>新建任务</Button>
            <Segmented block className="record-view-switch" aria-label="任务分类方式" value={conversationView} onChange={value => setConversationView(value as ConversationView)} options={[{ label: '最近任务', value: 'recent' }, { label: '按患者', value: 'patient' }]} />
            <Input className="history-search" type="search" autoComplete="off" spellCheck={false} aria-label="搜索任务、患者姓名或患者编号" placeholder="搜索任务、患者姓名或患者编号" prefix={<SearchOutlined />} value={historySearch} onChange={event => setHistorySearch(event.target.value)} allowClear />
            <Segmented block className="record-source-switch" aria-label="任务来源" value={conversationSource} onChange={value => setConversationSource(value as ConversationSource)} options={[{ label: '全部', value: 'all' }, { label: '主动创建', value: 'manual' }, { label: '定时生成', value: 'automatic' }]} />
            {filteredConversations.length ? conversationView === 'recent'
              ? <div className="conversation-time-groups">{recentConversationGroups.map(([group, items]) => <section key={group} className="conversation-record-group"><h3>{group}</h3><ConversationRecordList items={items} activeKey={activeKey} onSelect={selectConversation} onRename={chat => { setRenameKey(chat.key); setRenameText(chat.title); }} onDelete={deleteConversation} /></section>)}</div>
              : <Collapse className="patient-conversation-groups" ghost items={patientConversationGroups.map(([groupKey, items]) => {
                const patient = getPatient(groupKey);
                const label = groupKey === 'batch' ? <span className="patient-conversation-group-title">多患者／批量简报</span> : groupKey === 'unassigned' ? <span className="patient-conversation-group-title">未关联患者</span> : patient ? <><span className="patient-conversation-group-name">{patient.name}</span><span className="patient-conversation-group-meta">{patient.sex} · {patient.age} 岁 · {patient.cancerType}</span></> : <span className="patient-conversation-group-title">{groupKey}</span>;
                return { key: groupKey, label: <div className="patient-conversation-label"><span className="patient-conversation-label-text">{label}</span><span>{items.length} 条</span></div>, children: <ConversationRecordList items={items} activeKey={activeKey} onSelect={selectConversation} onRename={chat => { setRenameKey(chat.key); setRenameText(chat.title); }} onDelete={deleteConversation} /> };
              })} />
              : <Empty description="没有匹配的任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </div>,
        },
        {
          key: 'schedules', label: '定时任务', children: <div className="schedule-center">
            <Button block icon={<NewTaskIcon />} onClick={() => setEditingSchedule('new')}>新建定时任务</Button>
            <Segmented block className="schedule-view-switch" aria-label="定时任务列表" value={scheduleListView} onChange={value => setScheduleListView(value as 'active' | 'deleted')} options={[{ label: '当前任务', value: 'active' }, { label: '已删除', value: 'deleted' }]} />
            <div className="schedule-list">{visibleSchedules.map(schedule => <article key={schedule.id} className="schedule-card" aria-label={schedule.name}>
              <div className="schedule-card-header"><div><strong>{schedule.name}</strong><span className="schedule-type">{tasks[schedule.type].label}</span></div>{schedule.deletedAt ? <Tag>已删除</Tag> : <Switch checked={schedule.enabled} aria-label={`${schedule.enabled ? '暂停' : '启用'}${schedule.name}`} onChange={checked => toggleScheduledTask(schedule.id, checked)} />}</div>
              <p className="schedule-rule">{scheduleRuleLabel(schedule)}</p>
              <div className="schedule-meta"><span>{schedule.deletedAt ? '删除时间' : '下次执行'}</span><strong>{schedule.deletedAt ?? schedule.nextRun}</strong></div>
              {schedule.lastRun && <div className="schedule-last-run"><span>最近执行</span><span>{schedule.lastRun.time}</span><Tag color={schedule.lastRun.status === 'success' ? 'success' : schedule.lastRun.status === 'failed' ? 'error' : 'default'}>{runStatusLabel(schedule.lastRun.status)}</Tag></div>}
              {!schedule.deletedAt && <div className="schedule-actions"><Button type="link" disabled={!schedule.enabled} onClick={() => runScheduledTask(schedule)}>立即执行</Button><Button type="link" onClick={() => setEditingSchedule(schedule.id)}>编辑</Button><Dropdown trigger={['click']} menu={{ items: [{ key: 'delete', label: '删除任务', icon: <DeleteOutlined />, danger: true }], onClick: () => deleteScheduledTask(schedule) }}><Button type="text" aria-label={`定时任务操作：${schedule.name}`} icon={<MoreOutlined />} /></Dropdown></div>}
              <Button type="text" className="schedule-runs-link" onClick={() => setExecutionScheduleId(schedule.id)}><ArrowRightOutlined />运行记录 {schedule.runs.length}</Button>
            </article>)}</div>
            {!visibleSchedules.length && <Empty description={scheduleListView === 'deleted' ? '暂无已删除任务' : '暂无定时任务'} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            <p className="schedule-rule-note">当前为定时任务交互演示，尚未接入后台自动执行服务。</p>
          </div>,
        },
      ]} />}
    </aside>}

    <Modal title="重命名任务" open={Boolean(renameKey)} onCancel={() => setRenameKey(undefined)} okText="保存" cancelText="取消" okButtonProps={{ disabled: !renameText.trim() }} onOk={() => { setConversations(previous => previous.map(chat => chat.key === renameKey ? { ...chat, title: renameText.trim() } : chat)); setRenameKey(undefined); }}><Input aria-label="任务名称" maxLength={60} value={renameText} onChange={event => setRenameText(event.target.value)} /></Modal>
    <WorkflowSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} template={template} onTemplate={setTemplate} events={events} />
    <Drawer title="数据与权限" open={sourceOpen} onClose={() => setSourceOpen(false)} size={400}><div className="info-section"><SafetyCertificateOutlined /><h3>数据范围与权限</h3><p>本页未连接患者系统、医学知识库或 AI 服务。输入仅保留在当前页面内，刷新后重置。</p></div><div className="info-section"><h3>原始记录与来源</h3><p>当前页面展示患者详情、入院准备和随访记录。正式接入后，简报需在授权范围内查询，并支持回溯原始记录。</p></div></Drawer>
    <Modal title="关于 CARES 个案助手" open={helpOpen} onCancel={() => setHelpOpen(false)} footer={<Button type="primary" onClick={() => setHelpOpen(false)}>知道了</Button>}><p>当前尚未连接经授权的业务系统与 AI 服务。正式使用前需完成权限、审计及医疗内容审核。</p></Modal>
  </div>;
}

function ConversationRecordList({ items, activeKey, onSelect, onRename, onDelete }: {
  items: Conversation[];
  activeKey?: string;
  onSelect: (key: string) => void;
  onRename: (chat: Conversation) => void;
  onDelete: (chat: Conversation) => void;
}) {
  return <div className="conversation-record-list">{items.map(chat => {
    const patientId = conversationPatientId(chat);
    const patient = patientId && patientId !== 'all' ? getPatient(patientId) : undefined;
    const scope = patientId === 'all' ? '多患者' : patient ? patient.name : '未关联患者';
    return <div key={chat.key} className={`conversation-record-row ${chat.key === activeKey ? 'active' : ''}`}>
      <button type="button" className="conversation-record-main" onClick={() => onSelect(chat.key)}>
        <span className="conversation-record-title">{chat.title}</span>
        <span className="conversation-record-meta"><span>{scope}</span>{chat.source === 'automatic' && <Tag color="blue">定时生成</Tag>}</span>
      </button>
      <span className="conversation-record-time">{chat.updatedLabel ?? chat.group}</span>
      <Dropdown trigger={['click']} menu={{ items: [{ key: 'rename', label: '重命名', icon: <EditOutlined /> }, { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true }], onClick: ({ key }) => key === 'rename' ? onRename(chat) : onDelete(chat) }}><Button type="text" className="conversation-record-more" aria-label={`任务操作：${chat.title}`} icon={<MoreOutlined />} /></Dropdown>
    </div>;
  })}</div>;
}

function scheduleRuleLabel(schedule: ScheduledTask) {
  const scope = schedule.scope.includes('all')
    ? (schedule.type === 'call' ? '全部授权患者' : '全部计划入院患者')
    : schedule.scope.join('、');
  if (schedule.type === 'call') {
    const triggers = schedule.callTriggers ?? ['admission', 'incomplete-plan'];
    const conditions = [
      triggers.includes('admission') ? '入院前1天' : '',
      triggers.includes('incomplete-plan') ? '复查/随访到提醒日仍未完成' : '',
    ].filter(Boolean).join('；');
    return `${schedule.repeat === 'weekdays' ? '工作日' : '每天'} ${schedule.pushTime ?? '08:00'} · ${scope} · ${conditions || '未设置触发条件'}`;
  }
  const repeat = schedule.repeat === 'once' ? `仅一次 ${schedule.executionDate ?? ''}` : schedule.repeat === 'weekdays' ? '工作日' : '每天';
  const aggregation = schedule.aggregation === 'group' ? '按治疗组拆分' : '生成一份汇总';
  return `${repeat} ${schedule.time ?? '17:00'} · ${admissionDateRuleLabel(schedule)} · ${scope} · ${aggregation}`;
}

function runStatusLabel(status: ScheduleRunStatus) {
  return status === 'success' ? '成功' : status === 'failed' ? '失败' : '已跳过';
}

function ScheduleTaskEditor({ task, onBack, onSave }: { task?: ScheduledTask; onBack: () => void; onSave: (draft: ScheduleDraft) => void }) {
  const [form] = Form.useForm();
  const taskType = Form.useWatch('type', form) ?? task?.type ?? 'call';
  const admissionTarget = Form.useWatch('admissionTarget', form) ?? 'tomorrow';
  const repeat = Form.useWatch('repeat', form) ?? 'daily';
  const treatmentGroups = Array.from(new Set(demoPatients.map(patient => patient.treatmentGroup)));
  const days = task?.admissionDays ?? 1;
  const initialValues = {
    type: task?.type ?? 'call',
    name: task?.name ?? tasks.call.label,
    enabled: task?.enabled ?? true,
    scope: task?.scope ?? ['all'],
    callTriggers: task?.callTriggers ?? ['admission', 'incomplete-plan'],
    pushTime: dayjs(`2026-01-01T${task?.pushTime ?? '08:00'}:00`),
    time: dayjs(`2026-01-01T${task?.time ?? '17:00'}:00`),
    repeat: task?.repeat ?? 'daily',
    executionDate: task?.executionDate ? dayjs(task.executionDate) : dayjs().add(1, 'day'),
    aggregation: task?.aggregation ?? 'all',
    admissionTarget: task?.admissionDateMode === 'fixed' ? 'fixed' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : days === 2 ? 'afterTomorrow' : 'custom',
    admissionDays: days > 2 ? days : 3,
    admissionDate: task?.admissionDate ? dayjs(task.admissionDate) : dayjs().add(1, 'day'),
  };
  return <div className="schedule-editor">
    <div className="schedule-editor-heading"><h3>任务规则</h3><p>设置生成规则，成功结果会自动进入任务记录。</p></div>
    <Form form={form} layout="vertical" initialValues={initialValues} onKeyDown={event => {
      if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.closest('.ant-picker')) event.preventDefault();
    }} onFinish={values => {
      const fixed = values.admissionTarget === 'fixed';
      const admissionDays = values.admissionTarget === 'today' ? 0 : values.admissionTarget === 'tomorrow' ? 1 : values.admissionTarget === 'afterTomorrow' ? 2 : values.admissionDays;
      const draft: ScheduleDraft = {
        type: values.type, name: values.name.trim(), enabled: values.enabled, scope: values.scope,
        repeat: values.type === 'admission' && fixed ? 'once' : values.repeat,
        ...(values.type === 'call'
          ? { callTriggers: values.callTriggers, pushTime: values.pushTime.format('HH:mm') }
          : { time: values.time.format('HH:mm'), aggregation: values.aggregation,
              admissionDateMode: fixed ? 'fixed' : 'relative', admissionDays,
              ...(fixed ? { admissionDate: values.admissionDate.format('YYYY-MM-DD') } : {}),
              ...(fixed || values.repeat === 'once' ? { executionDate: values.executionDate.format('YYYY-MM-DD') } : {}),
            }),
      };
      if (draft.enabled && !nextScheduleExecution(draft)) {
        form.setFields([{ name: 'executionDate', errors: ['请选择尚未到达的执行日期和时间'] }]);
        return;
      }
      onSave(draft);
    }}>
      <section className="schedule-editor-section" aria-labelledby="schedule-editor-basic-title">
        <h4 id="schedule-editor-basic-title">基本信息</h4>
        <Form.Item name="type" label="任务类型" rules={[{ required: true }]}><Select aria-label="任务类型" disabled={Boolean(task)} options={[{ label: '呼叫前简报', value: 'call' }, { label: '入院简报', value: 'admission' }]} onChange={value => {
          const name = form.getFieldValue('name');
          form.setFieldsValue({ repeat: 'daily', admissionTarget: 'tomorrow', ...([tasks.call.label, tasks.admission.label].includes(name) ? { name: tasks[value as 'call' | 'admission'].label } : {}) });
        }} /></Form.Item>
        <Form.Item name="name" label="任务名称" rules={[{ required: true, whitespace: true, message: '请输入任务名称' }]}><Input aria-label="定时任务名称" maxLength={60} placeholder="例如：王医生组每日入院准备" /></Form.Item>
        <Form.Item
          name="scope"
          label="患者范围"
          rules={[{ type: 'array', required: true, min: 1, message: '请选择患者范围' }]}
          getValueFromEvent={(values: string[]) => {
            const previous = form.getFieldValue('scope') as string[];
            if (values.includes('all') && !previous.includes('all')) return ['all'];
            return values.filter(value => value !== 'all').length
              ? values.filter(value => value !== 'all')
              : values;
          }}
        >
          <Select
            mode="multiple"
            maxTagCount="responsive"
            placeholder="选择一个或多个治疗组"
            options={[{ label: taskType === 'admission' ? '全部计划入院患者' : '全部授权患者', value: 'all' }, ...treatmentGroups.map(group => ({ label: group, value: group }))]}
          />
        </Form.Item>
      </section>
      <section className="schedule-editor-section" aria-labelledby="schedule-editor-rule-title">
        <h4 id="schedule-editor-rule-title">执行规则</h4>
        {taskType === 'admission' && <>
          <Form.Item name="admissionTarget" label="简报对应的入院日期" rules={[{ required: true }]}><Select aria-label="简报对应的入院日期" options={[{ label: '执行当天', value: 'today' }, { label: '明日（执行后 1 天）', value: 'tomorrow' }, { label: '后天（执行后 2 天）', value: 'afterTomorrow' }, { label: '执行后若干天', value: 'custom' }, { label: '指定入院日期', value: 'fixed' }]} onChange={value => {
            if (value === 'fixed') form.setFieldsValue({ repeat: 'once' });
            else if (admissionTarget === 'fixed') form.setFieldsValue({ repeat: 'daily' });
          }} /></Form.Item>
          {admissionTarget === 'custom' && <Form.Item name="admissionDays" label="执行后天数" rules={[{ required: true, type: 'number', min: 0, max: 3650, message: '请输入 0–3650 之间的天数' }]}><InputNumber aria-label="执行后天数" min={0} max={3650} precision={0} /></Form.Item>}
          {admissionTarget === 'fixed' && <Form.Item name="admissionDate" label="指定入院日期" rules={[{ required: true, message: '请选择入院日期' }]}><DatePicker aria-label="指定入院日期" format="YYYY-MM-DD" /></Form.Item>}
          <p className="schedule-rule-note">{admissionTarget === 'fixed' ? '指定入院日期只执行一次，请分别设置入院日期和任务执行日期。' : '入院日期以每次任务实际执行的日期为基准计算。'}</p>
        </>}
        <Form.Item name="repeat" label="执行频率" rules={[{ required: true }]}><Select aria-label="执行频率" options={taskType === 'admission' && admissionTarget === 'fixed' ? [{ label: '仅一次', value: 'once' }] : [{ label: '每天', value: 'daily' }, { label: '仅工作日', value: 'weekdays' }, ...(taskType === 'admission' ? [{ label: '仅一次', value: 'once' }] : [])]} /></Form.Item>
        {taskType === 'admission' && (repeat === 'once' || admissionTarget === 'fixed') && <Form.Item name="executionDate" label="任务执行日期" rules={[{ required: true, message: '请选择执行日期' }]}><DatePicker aria-label="任务执行日期" format="YYYY-MM-DD" disabledDate={date => date.startOf('day').isBefore(dayjs().startOf('day'))} /></Form.Item>}
        {taskType === 'call' ? <>
          <Form.Item name="callTriggers" label="自动生成条件" rules={[{ type: 'array', required: true, min: 1, message: '至少选择一项生成条件' }]}>
            <Checkbox.Group className="schedule-trigger-options" options={[
              { label: '患者入院前1天', value: 'admission' },
              { label: '复查或随访计划到提醒日期仍未完成', value: 'incomplete-plan' },
            ]} />
          </Form.Item>
          <Form.Item name="pushTime" label="推送时间" rules={[{ required: true, message: '请选择推送时间' }]}>
            <TimePicker format="HH:mm" minuteStep={15} allowClear={false} />
          </Form.Item>
          <p className="schedule-rule-note">同一患者、同一计划、同一天只生成一次；计划完成后停止生成。</p>
        </> : <>
          <Form.Item name="time" label="执行时间" rules={[{ required: true, message: '请选择执行时间' }]}><TimePicker format="HH:mm" minuteStep={15} allowClear={false} /></Form.Item>
          <Form.Item name="aggregation" label="汇总方式" rules={[{ required: true, message: '请选择汇总方式' }]}><Select options={[{ label: '生成一份汇总', value: 'all' }, { label: '按治疗组拆分', value: 'group' }]} /></Form.Item>
        </>}
      </section>
      <section className="schedule-editor-section schedule-editor-status" aria-labelledby="schedule-editor-status-title">
        <h4 id="schedule-editor-status-title">任务状态</h4>
        <Form.Item name="enabled" valuePropName="checked"><ConfigProvider theme={{ components: { Switch: { fontSize: 14, trackHeight: 28, trackMinWidth: 72, handleSize: 24, innerMinMargin: 12, innerMaxMargin: 32 } } }}><Switch size="default" checkedChildren="已启用" unCheckedChildren="已暂停" /></ConfigProvider></Form.Item>
      </section>
      <div className="schedule-editor-actions"><Button type="primary" htmlType="submit">保存任务</Button><Button onClick={onBack}>取消</Button></div>
    </Form>
  </div>;
}

function ScheduleRunsPanel({ schedule, onSelectConversation }: { schedule: ScheduledTask; onSelectConversation: (key: string) => void }) {
  const [status, setStatus] = useState<'all' | ScheduleRunStatus>('all');
  const runs = status === 'all' ? schedule.runs : schedule.runs.filter(run => run.status === status);
  return <div className="schedule-runs-panel">
    <div className="schedule-runs-summary"><div><span>任务类型</span><strong>{schedule.type === 'call' ? '呼叫前简报' : '入院简报'}</strong></div><div><span>当前状态</span><Tag color={schedule.enabled ? 'success' : 'default'}>{schedule.deletedAt ? '已删除' : schedule.nextRun === '已完成' ? '已完成' : schedule.enabled ? '运行中' : '已暂停'}</Tag></div><div><span>执行规则</span><strong>{scheduleRuleLabel(schedule)}</strong></div></div>
    <div className="schedule-runs-toolbar"><strong>执行记录</strong><Segmented size="small" value={status} onChange={value => setStatus(value as 'all' | ScheduleRunStatus)} options={[{ label: '全部', value: 'all' }, { label: '成功', value: 'success' }, { label: '失败', value: 'failed' }, { label: '已跳过', value: 'skipped' }]} /></div>
    {runs.length ? <div className="schedule-run-list">{runs.map(run => <article className="schedule-run-item" key={run.id}><div className="schedule-run-item-header"><Tag color={run.status === 'success' ? 'success' : run.status === 'failed' ? 'error' : 'default'}>{runStatusLabel(run.status)}</Tag><span>{run.time}</span></div><p>{run.detail}</p>{run.conversationKey && <Button type="link" onClick={() => onSelectConversation(run.conversationKey!)}>查看任务</Button>}</article>)}</div> : <Empty description="暂无匹配的执行记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
  </div>;
}

const AccessibleInput = (props: React.ComponentProps<typeof Input.TextArea>) => <Input.TextArea {...props} aria-label="描述管案需求" />;

function PatientScopePicker({ value, disabled = false, onChange, confirmOpen, confirmDescription, onConfirm, onCancel }: { value: string[]; disabled?: boolean; onChange: (value: string[]) => void; confirmOpen?: boolean; confirmDescription?: string; onConfirm?: () => void; onCancel?: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<string[]>(value);
  const [collapsedDepartments, setCollapsedDepartments] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const normalizedSearch = search.trim().toLowerCase();
  const selectedIds = draft.includes('all') ? demoPatients.map(patient => patient.id) : draft;
  const isSelected = (ids: string[]) => ids.length > 0 && ids.every(id => selectedIds.includes(id));
  const selectedCount = (ids: string[]) => ids.filter(id => selectedIds.includes(id)).length;
  const togglePatients = (ids: string[]) => {
    if (draft.includes('all')) {
      setDraft(ids.length === demoPatients.length ? ['all'] : ids);
      return;
    }
    const next = new Set(selectedIds);
    const shouldRemove = isSelected(ids);
    ids.forEach(id => shouldRemove ? next.delete(id) : next.add(id));
    const nextIds = Array.from(next);
    setDraft(nextIds.length === demoPatients.length ? ['all'] : nextIds);
  };
  const toggleCollapsed = (key: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(previous => previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key]);
  };
  const stopLabelSelection = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const visiblePatients = demoPatients.filter(patient => `${patient.name}${patient.id}${patient.cancerType}${patient.department}${patient.treatmentGroup}`.toLowerCase().includes(normalizedSearch));
  const departments = Array.from(new Set(demoPatients.map(patient => patient.department)));
  const selectedPatients = demoPatients.filter(patient => selectedIds.includes(patient.id));
  const savedPatients = demoPatients.filter(patient => value.includes(patient.id));
  const buttonLabel = value.includes('all') ? '全部患者' : savedPatients.length === 1 ? savedPatients[0].name : savedPatients.length ? `已选${savedPatients.length}位患者` : '请选择患者';

  return <Popconfirm
    open={confirmOpen}
    overlayClassName="patient-scope-confirm"
    title="确认切换患者？"
    description={confirmDescription}
    okText="继续切换"
    cancelText="取消"
    placement="topLeft"
    onOpenChange={nextOpen => {
      if (!nextOpen && confirmOpen) onCancel?.();
    }}
    onConfirm={onConfirm}
    onCancel={onCancel}
  >
    <Dropdown trigger={['click']} open={open} onOpenChange={nextOpen => { setOpen(nextOpen); if (nextOpen) setDraft(value); else setSearch(''); }} menu={{ items: [] }} popupRender={() => <div className="patient-scope-popup" role="dialog" aria-label="选择患者">
    <Input className="patient-scope-search" aria-label="搜索患者" placeholder="搜索患者、科室或治疗组" prefix={<SearchOutlined />} allowClear value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.stopPropagation()} />
    <div className="patient-scope-options">
      <label className={`patient-scope-option patient-scope-option-all ${draft.includes('all') ? 'selected' : ''}`}><Checkbox checked={draft.includes('all')} indeterminate={!draft.includes('all') && selectedIds.length > 0} onChange={() => setDraft(draft.includes('all') ? [] : ['all'])} /><strong>全部患者<small>{demoPatients.length}位</small></strong></label>
      {departments.map(department => {
        const departmentPatients = demoPatients.filter(patient => patient.department === department);
        const departmentVisible = departmentPatients.filter(patient => visiblePatients.includes(patient));
        if (!departmentVisible.length) return null;
        const groups = Array.from(new Set(departmentVisible.map(patient => patient.treatmentGroup)));
        const departmentCollapsed = collapsedDepartments.includes(department);
        return <div className="patient-scope-department" key={department}>
          <label className={`patient-scope-option patient-scope-level-department ${isSelected(departmentPatients.map(patient => patient.id)) ? 'selected' : ''}`}><Checkbox checked={isSelected(departmentPatients.map(patient => patient.id))} indeterminate={selectedCount(departmentPatients.map(patient => patient.id)) > 0 && !isSelected(departmentPatients.map(patient => patient.id))} onChange={() => togglePatients(departmentPatients.map(patient => patient.id))} /><strong>{department}<small>{selectedCount(departmentPatients.map(patient => patient.id))}/{departmentPatients.length}位</small></strong><span className="patient-scope-expand" role="button" tabIndex={0} aria-label={`${department}${departmentCollapsed ? '展开' : '收起'}`} onClick={event => { stopLabelSelection(event); toggleCollapsed(department, setCollapsedDepartments); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { stopLabelSelection(event); toggleCollapsed(department, setCollapsedDepartments); } }}>{departmentCollapsed ? <RightOutlined /> : <DownOutlined />}</span></label>
          {!departmentCollapsed && groups.map(group => {
            const groupPatients = departmentVisible.filter(patient => patient.treatmentGroup === group);
            const allGroupPatients = departmentPatients.filter(patient => patient.treatmentGroup === group);
            const groupKey = `${department}::${group}`;
            const groupCollapsed = collapsedGroups.includes(groupKey);
            return <div key={group}>
              <label className={`patient-scope-option patient-scope-level-group ${isSelected(allGroupPatients.map(patient => patient.id)) ? 'selected' : ''}`}><Checkbox checked={isSelected(allGroupPatients.map(patient => patient.id))} indeterminate={selectedCount(allGroupPatients.map(patient => patient.id)) > 0 && !isSelected(allGroupPatients.map(patient => patient.id))} onChange={() => togglePatients(allGroupPatients.map(patient => patient.id))} /><strong>{group}<small>{selectedCount(allGroupPatients.map(patient => patient.id))}/{allGroupPatients.length}位</small></strong><span className="patient-scope-expand" role="button" tabIndex={0} aria-label={`${group}${groupCollapsed ? '展开' : '收起'}`} onClick={event => { stopLabelSelection(event); toggleCollapsed(groupKey, setCollapsedGroups); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { stopLabelSelection(event); toggleCollapsed(groupKey, setCollapsedGroups); } }}>{groupCollapsed ? <RightOutlined /> : <DownOutlined />}</span></label>
              {!groupCollapsed && groupPatients.map(patient => <label className={`patient-scope-option patient-scope-level-patient ${selectedIds.includes(patient.id) ? 'selected' : ''}`} key={patient.id}><Checkbox checked={selectedIds.includes(patient.id)} onChange={() => togglePatients([patient.id])} /><strong>{patient.name}<small>{patient.sex} · {patient.age} 岁 · {patient.cancerType}</small></strong></label>)}
            </div>;
          })}
        </div>;
      })}
      {!visiblePatients.length && <div className="patient-scope-empty">没有匹配的患者</div>}
    </div>
    <div className="patient-scope-footer"><span>已选 {selectedPatients.length} 位患者</span><Button type="primary" size="small" disabled={!draft.length || samePatientScope(draft, value)} onClick={() => { onChange(draft); setOpen(false); }}>确认选择</Button></div>
  </div>}>
      <Button className="patient-scope" type="text" aria-label="选择患者范围" disabled={disabled}>{buttonLabel}{!disabled && <FigmaIcon name="d364b" />}</Button>
    </Dropdown>
  </Popconfirm>;
}

function BriefPatientPanel({ briefRequest, patientSearch, setPatientSearch, onChoose, onClose }: {
  briefRequest: BriefRequest;
  patientSearch: string;
  setPatientSearch: (value: string) => void;
  onChoose: (patientId: string) => void;
  onClose: () => void;
}) {
  const patients = demoPatients.filter(patient => (briefRequest.task !== 'admission' || patient.admission) && `${patient.name}${patient.id}`.includes(patientSearch.trim()));
  return <div className="brief-panel" role="dialog" aria-label={`生成${tasks[briefRequest.task].label}`}>
    <div className="brief-panel-header"><div><strong>{tasks[briefRequest.task].label}</strong><span>选择患者后自动生成</span></div><Button type="text" aria-label="关闭患者选择" icon={<FigmaIcon name="8affd" />} onClick={onClose} /></div>
    <Input aria-label="搜索简报患者" placeholder="搜索姓名或患者编号" prefix={<SearchOutlined />} allowClear value={patientSearch} onChange={event => setPatientSearch(event.target.value)} />
    <div className="brief-panel-options">
      {patients.map(patient => <button type="button" className={`brief-patient-option ${briefRequest.context.patientId === patient.id ? 'selected' : ''}`} key={patient.id} onClick={() => onChoose(patient.id)}><strong>{patient.name}<small>{patient.sex} · {patient.age} 岁 · {patient.cancerType}</small></strong><span>{patient.department} · {patient.treatmentGroup} · {patient.careStatus}</span></button>)}
    </div>
  </div>;
}

function SharedBriefPage({ payload }: { payload: SharePayload }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return <main className="shared-brief-page">
    <header className="shared-brief-header"><div className="shared-brand"><img src="/favicon.svg" alt="海心" /><span>海心个案助手</span></div><Tag color="blue">分享查看</Tag></header>
    <BriefWebDocument payload={payload} actions={<div className="shared-actions"><Button icon={<CopyOutlined />} onClick={copyLink}>{copied ? '已复制链接' : '复制链接'}</Button><Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button></div>} />
  </main>;
}

const webTreatmentFields = ['治疗阶段', '上次治疗时间', '治疗方案', '本次来院目的'];
const webLabFields = ['血常规', '血生化', '凝血', '甲功', '心肌酶', '肿瘤标志物'];
const webHiddenFields = ['患者信息', '风险与缺失', '待确认问题'];

function BriefWebDocument({ payload, actions }: { payload: SharePayload; actions?: ReactNode }) {
  const admissionSections = payload.task === 'admission' ? payload.sections?.filter(section => section.patientId) ?? [] : [];
  const extraSections = payload.task === 'admission' ? payload.sections?.filter(section => !section.patientId) ?? [] : [];
  return <article className="brief-web-document">
    <header className="brief-web-heading">
      <div className="brief-web-title"><span>CARES · 个案简报</span><h1>{payload.title}</h1><p>生成于 {payload.createdAt}</p></div>
      {actions}
    </header>
    {extraSections.map(section => <section className={section.title === '简报概览' ? 'brief-web-overview' : 'brief-web-note'} key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
    {admissionSections.length > 0 ? <div className="brief-web-patients">
      {admissionSections.map((section, index) => {
        const patient = getPatient(section.patientId!);
        const fields = (section.fields ?? []).filter(field => !webHiddenFields.includes(field.title));
        const treatment = fields.filter(field => webTreatmentFields.includes(field.title));
        const labs = fields.filter(field => webLabFields.includes(field.title));
        const others = fields.filter(field => !webTreatmentFields.includes(field.title) && !webLabFields.includes(field.title));
        return <section className="brief-web-patient" key={section.patientId} aria-label={`${patient?.name ?? section.title}的入院简报`}>
          <header className="brief-web-patient-header"><span className="brief-web-patient-index">{String(index + 1).padStart(2, '0')}</span><div><h2>{patient?.name ?? section.title}</h2><p>{patient ? `${patient.sex} · ${patient.age} 岁 · ${patient.cancerType}` : section.title}</p><p>{patient ? `${patient.department} / ${patient.treatmentGroup}` : ''}</p></div></header>
          {treatment.length > 0 && <section className="brief-web-patient-section"><h3>治疗信息</h3><dl className="brief-web-field-list">{treatment.map(field => <div key={field.title}><dt>{field.title}</dt><dd>{field.body}</dd></div>)}</dl></section>}
          {labs.length > 0 && <section className="brief-web-patient-section"><h3>最近一次检验</h3><dl className="brief-web-field-list brief-web-labs">{labs.map(field => <div key={field.title}><dt>{field.title}</dt><dd>{field.body}</dd></div>)}</dl></section>}
          {others.map(field => <section className="brief-web-patient-section" key={field.title}><h3>{field.title}</h3><p>{field.body}</p></section>)}
          {!fields.length && <p className="brief-web-empty">暂无可展示的简报内容</p>}
        </section>;
      })}
    </div> : !payload.sections?.length && <p className="brief-web-plain">{payload.content}</p>}
    {payload.task !== 'admission' && payload.sections?.map(section => <section className="brief-web-note" key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
    <footer className="brief-web-footnote">请在授权范围内使用，并以原始记录为准。未查询到记录不等于未发生。</footer>
  </article>;
}

function BriefPreviewPane({ payload, onClose }: { payload: SharePayload; onClose: () => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  return <aside className="brief-preview-pane" aria-label="简报详情">
    <header className="brief-preview-header">
      <div><strong>简报详情</strong></div>
      <div className="brief-preview-header-actions"><Button type="text" aria-label="分享简报" icon={<ShareAltOutlined />} onClick={() => setShareOpen(true)} /><Button type="text" aria-label="关闭网页预览" icon={<CloseOutlined />} onClick={onClose} /></div>
    </header>
    <div className="brief-preview-scroll">
      <div className="brief-preview-document"><BriefWebDocument payload={payload} /></div>
    </div>
    <BriefShareModal payload={payload} open={shareOpen} onClose={() => setShareOpen(false)} />
  </aside>;
}
