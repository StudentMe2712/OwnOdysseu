/* ============================================================================
 * Odysseus i18n — framework-free, no build step. Russian by default.
 *
 * Loaded as a CLASSIC (non-module) script in <head>, BEFORE the ES module
 * bundle, so window.t / applyI18n / setLang exist for every module + inline
 * block from first execution.
 *
 * TWO layers translate the (English-source) UI into Russian:
 *   1. Key-based: elements opt in with data-i18n / -title / -placeholder /
 *      -aria / -html and window.t('key'). Used for the curated chrome.
 *   2. Phrase-based auto-translate: a PHRASES map ("English exact" -> "Русский")
 *      + a MutationObserver translate every matching text node and the
 *      title / placeholder / aria-label attributes as the app renders. This is
 *      what gives whole-app coverage without editing 160 JS files.
 *
 * Safety:
 *   - Auto-translate runs ONLY in Russian. English is the source language, so
 *     switching to English just stops the observer -> the original, unmodified
 *     app. That is the escape hatch if anything ever looks wrong.
 *   - EXACT trimmed match only: a text node is translated only when its whole
 *     trimmed text equals a known UI phrase. Arbitrary user/AI content never
 *     matches, so it is left alone.
 *   - Blacklisted subtrees are never touched: the chat transcript (#chat-history,
 *     streamed AI output), code, the document editor, inputs, and anything with
 *     [data-no-i18n].
 *   - Strings the app reads back from the DOM (e.g. textContent === 'AI') are
 *     kept OUT of PHRASES so translating them can't break logic.
 * ==========================================================================*/
(function () {
  'use strict';

  var STORAGE_KEY = 'odysseus-lang';
  var DEFAULT_LANG = 'ru';
  var SUPPORTED = ['ru', 'en'];

  // ---- Layer 1: key-based catalog (curated chrome that uses data-i18n) ------
  var STRINGS = {
    'rail.search':        { en: 'Search conversations (Ctrl+K)', ru: 'Поиск по чатам (Ctrl+K)' },
    'rail.newChat':       { en: 'New chat',         ru: 'Новый чат' },
    'rail.deleteSession': { en: 'Delete session',   ru: 'Удалить сессию' },
    'rail.calendar':      { en: 'Calendar',         ru: 'Календарь' },
    'rail.compare':       { en: 'Compare',          ru: 'Сравнение' },
    'rail.cookbook':      { en: 'Cookbook',         ru: 'Cookbook' },
    'rail.research':      { en: 'Deep Research',    ru: 'Глубокое исследование' },
    'rail.email':         { en: 'Email',            ru: 'Почта' },
    'rail.gallery':       { en: 'Gallery',          ru: 'Галерея' },
    'rail.library':       { en: 'Library',          ru: 'Библиотека' },
    'rail.brain':         { en: 'Brain',            ru: 'Память' },
    'rail.notes':         { en: 'Notes',            ru: 'Заметки' },
    'rail.tasks':         { en: 'Tasks',            ru: 'Задачи' },
    'rail.theme':         { en: 'Theme',            ru: 'Тема' },
    'rail.settings':      { en: 'Settings',         ru: 'Настройки' },
    'rail.showSidebar':   { en: 'Show sidebar',     ru: 'Показать панель' },
    'rail.toggleSidebar': { en: 'Toggle sidebar',   ru: 'Переключить панель' },
    'sidebar.newChat':    { en: 'New Chat',         ru: 'Новый чат' },
    'sidebar.search':     { en: 'Search',           ru: 'Поиск' },
    'sidebar.chats':      { en: 'Chats',            ru: 'Чаты' },
    'sidebar.manage':     { en: 'manage',           ru: 'управление' },
    'sidebar.sortActive': { en: 'Last Active',      ru: 'По активности' },
    'sidebar.sortNewest': { en: 'Newest First',     ru: 'Сначала новые' },
    'sidebar.sortFolder': { en: 'By Folder',        ru: 'По папкам' },
    'sidebar.group':      { en: 'Group',            ru: 'Группировать' },
    'sidebar.rearrange':  { en: 'Rearrange',        ru: 'Переставить' },
    'sidebar.select':     { en: 'Select',           ru: 'Выбрать' },
    'sidebar.all':        { en: 'All',              ru: 'Все' },
    'session.rename':     { en: 'Rename',           ru: 'Переименовать' },
    'session.renameDesc': { en: 'Change the session name', ru: 'Изменить название сессии' },
    'session.delete':     { en: 'Delete',           ru: 'Удалить' },
    'session.deleteDesc': { en: 'Remove this session permanently', ru: 'Удалить эту сессию навсегда' },
    'session.memory':     { en: 'Memory',           ru: 'Память' },
    'session.memoryDesc': { en: 'Extract memories from this session', ru: 'Извлечь воспоминания из этой сессии' },
    'settings.title':       { en: 'Settings',       ru: 'Настройки' },
    'settings.close':       { en: 'Close settings', ru: 'Закрыть настройки' },
    'settings.addModels':   { en: 'Add Models',     ru: 'Добавить модели' },
    'settings.addedModels': { en: 'Added Models',   ru: 'Добавленные модели' },
    'settings.aiDefaults':  { en: 'AI Defaults',    ru: 'Параметры ИИ' },
    'settings.search':      { en: 'Search',         ru: 'Поиск' },
    'settings.integrations':{ en: 'Integrations',   ru: 'Интеграции' },
    'settings.email':       { en: 'Email',          ru: 'Почта' },
    'settings.reminders':   { en: 'Reminders',      ru: 'Напоминания' },
    'settings.appearance':  { en: 'Appearance',     ru: 'Внешний вид' },
    'settings.shortcuts':   { en: 'Shortcuts',      ru: 'Горячие клавиши' },
    'settings.account':     { en: 'Account',        ru: 'Аккаунт' },
    'settings.admin':       { en: 'Admin',          ru: 'Администрирование' },
    'settings.agentTools':  { en: 'Agent Tools',    ru: 'Инструменты агента' },
    'settings.users':       { en: 'Users',          ru: 'Пользователи' },
    'settings.system':      { en: 'System',         ru: 'Система' },
    'settings.language':      { en: 'Interface language', ru: 'Язык интерфейса' },
    'settings.languageLabel': { en: 'Language',           ru: 'Язык' },
    'common.save':    { en: 'Save',     ru: 'Сохранить' },
    'common.cancel':  { en: 'Cancel',   ru: 'Отмена' },
    'common.delete':  { en: 'Delete',   ru: 'Удалить' },
    'common.close':   { en: 'Close',    ru: 'Закрыть' },
    'common.yes':     { en: 'Yes',      ru: 'Да' },
    'common.no':      { en: 'No',       ru: 'Нет' },
    'common.ok':      { en: 'OK',       ru: 'ОК' },
    'common.confirm': { en: 'Confirm',  ru: 'Подтвердить' },
    'common.rename':  { en: 'Rename',   ru: 'Переименовать' },
    'common.name':    { en: 'Name',     ru: 'Название' },
    'common.copy':    { en: 'Copy',     ru: 'Копировать' },
    'common.copied':  { en: 'Copied',   ru: 'Скопировано' },
    'common.loading': { en: 'Loading…', ru: 'Загрузка…' },
    'welcome.sub': {
      en: 'Welcome, <span class="setup-trigger-link" style="color:var(--accent,var(--red));font-weight:600;cursor:pointer;text-decoration:underline;" title="Click to launch setup">type /setup</span> to get started.',
      ru: 'Добро пожаловать! Введите <span class="setup-trigger-link" style="color:var(--accent,var(--red));font-weight:600;cursor:pointer;text-decoration:underline;" title="Запустить настройку">/setup</span>, чтобы начать.'
    },
    'welcome.setup': {
      en: 'Type <span class="setup-trigger-link" style="color:var(--accent,var(--red));font-weight:600;cursor:pointer;text-decoration:underline;" title="Click to launch setup">/setup</span> to get started.',
      ru: 'Введите <span class="setup-trigger-link" style="color:var(--accent,var(--red));font-weight:600;cursor:pointer;text-decoration:underline;" title="Запустить настройку">/setup</span>, чтобы начать.'
    },
    'welcome.ready':    { en: 'Yours for the voyage.', ru: 'Готов к путешествию.' },
    'welcome.setupTip': { en: 'Type /setup, then choose Local models or API.', ru: 'Введите /setup и выберите локальные модели или API.' },
    'chat.composerPlaceholder': { en: 'Message Odysseus…', ru: 'Сообщение для Odysseus…' },
    'chat.composerAria':        { en: 'Message input',    ru: 'Поле ввода сообщения' },
    'chat.send':                { en: 'Send',             ru: 'Отправить' },
    'chat.stop':                { en: 'Stop',             ru: 'Остановить' }
  };

  // ---- Layer 2: phrase map (exact English UI text -> Russian) ---------------
  // Proper nouns (providers, model/voice names) are intentionally absent so they
  // stay as-is. Strings the app reads back from the DOM are absent too (see
  // READBACK_GUARD below). Keys use the DECODED text (e.g. "&" not "&amp;").
  var PHRASES = {
    "Account": "Аккаунт", "Add": "Добавить", "Add API Models": "Добавить API-модели",
    "Add Integration": "Добавить интеграцию", "Add Local Models": "Добавить локальные модели",
    "Add Memory": "Добавить запись", "Add Models": "Добавить модели", "Add Ollama": "Добавить Ollama",
    "Add Skill": "Добавить навык", "Add User": "Добавить пользователя",
    "Add a local model server (Ollama, llama.cpp, vLLM).": "Добавьте локальный сервер моделей (Ollama, llama.cpp, vLLM).",
    "Add a memory": "Добавить запись в память",
    "Add a model to try if the one above fails": "Запасная модель на случай сбоя предыдущей",
    "Add a model to try if the utility model fails": "Запасная модель на случай сбоя служебной модели",
    "Add a search provider to try if the primary fails": "Запасной поисковый провайдер на случай сбоя основного",
    "Add a vision model to try if the one above fails": "Запасная vision-модель на случай сбоя предыдущей",
    "Add model chat": "Добавить чат модели", "Add model endpoints": "Добавить эндпоинты моделей",
    "Add, edit, delete, and test accounts in Integrations.": "Добавляйте, изменяйте, удаляйте и проверяйте аккаунты в Интеграциях.",
    "Added Models": "Добавленные модели", "Added after your message": "Добавляется после вашего сообщения",
    "Added before your message": "Добавляется перед вашим сообщением", "Admin": "Администрирование",
    "Agent": "Агент", "Agent / Chat": "Агент / Чат", "Agent Tools": "Инструменты агента",
    "All": "Все", "All Levels": "Все уровни",
    "All external service connections in one place.": "Все подключения к внешним сервисам в одном месте.",
    "All skills": "Все навыки",
    "Allow anyone to create an account from the login page": "Разрешить создавать аккаунт со страницы входа",
    "Analogous": "Аналогичные", "Analyze images with a vision-capable model": "Анализ изображений vision-моделью",
    "Analyze images with a vision-capable model.": "Анализ изображений vision-моделью.",
    "Appearance": "Внешний вид", "Apply": "Применить", "Approve": "Одобрить",
    "Archive selected": "Архивировать выбранные", "Attach Files": "Прикрепить файлы",
    "Attach files": "Прикрепить файлы", "Audit": "Аудит", "Audit selected draft skills": "Проверить выбранные черновики навыков",
    "Auto-approve skills": "Автоодобрение навыков", "Auto-detect": "Автоопределение",
    "Auto-extract memories": "Автоизвлечение памяти", "Auto-extract skills": "Автоизвлечение навыков",
    "Auto-poll": "Автоопрос", "Auto-polling every 3 seconds": "Автоопрос каждые 3 секунды",
    "Automatically extract memories from conversations.": "Автоматически извлекать память из переписок.",
    "Avatar & name": "Аватар и имя", "Background": "Фон", "Background / Effect": "Фон / Эффект",
    "Balanced": "Сбалансированно", "Base URL or pick provider": "Базовый URL или выберите провайдера",
    "Blur emails, tokens, and secrets in AI output": "Размывать почту, токены и секреты в ответах ИИ",
    "Border": "Граница", "Border Chat Bubble": "Граница пузыря чата", "Brain": "Память",
    "Brand name": "Название бренда", "Browser (built-in)": "Браузер (встроенный)",
    "Browser notification (default)": "Уведомление браузера (по умолчанию)",
    "Built-in Tools": "Встроенные инструменты", "By Folder": "По папкам", "Calendar": "Календарь",
    "Cancel": "Отмена", "Cancel (Esc)": "Отмена (Esc)", "Change Password": "Сменить пароль",
    "Change the session name": "Изменить название сессии", "Channel": "Канал", "Chat": "Чат",
    "Chat Area": "Область чата", "Chat Bar": "Панель чата", "Chat Bubbles": "Пузыри чата",
    "Chat Input / Prompt Area": "Поле ввода / область запроса", "Chat area": "Область чата",
    "Chat history list": "Список истории чатов", "Chat ready": "Чат готов", "Chats": "Чаты",
    "Clear Advanced Overrides": "Сбросить расширенные настройки", "Clear offline": "Очистить офлайн",
    "Clear workspace": "Очистить рабочее пространство",
    "Click a shortcut to rebind. Press Escape to cancel.": "Нажмите на сочетание, чтобы переназначить. Esc — отмена.",
    "Click to launch setup": "Нажмите, чтобы запустить настройку", "Close cookbook": "Закрыть Cookbook",
    "Close memory modal": "Закрыть окно памяти", "Close prompt": "Закрыть запрос",
    "Close rename session modal": "Закрыть окно переименования", "Close settings": "Закрыть настройки",
    "Close theme": "Закрыть тему", "Code Bg": "Фон кода", "Code Blocks": "Блоки кода",
    "Code Text": "Текст кода", "Color Harmony": "Цветовая гармония", "Colors": "Цвета",
    "Comfortable": "Комфортно", "Compact": "Компактно", "Compare": "Сравнение",
    "Compare active — click to deactivate": "Сравнение активно — нажмите, чтобы отключить",
    "Complementary": "Дополнительные", "Compose email": "Написать письмо", "Confidence": "Уверенность",
    "Confidence ≤ 70%": "Уверенность ≤ 70%", "Confidence ≤ 75%": "Уверенность ≤ 75%",
    "Confidence ≤ 80%": "Уверенность ≤ 80%", "Confidence ≤ 85%": "Уверенность ≤ 85%",
    "Confidence ≤ 90%": "Уверенность ≤ 90%", "Confidence ≤ 95%": "Уверенность ≤ 95%",
    "Configure TTS provider for assistant message read-aloud.": "Настройте провайдера TTS для озвучивания сообщений ассистента.",
    "Configure email account, ntfy server, etc. in": "Настройте почтовый аккаунт, сервер ntfy и т. д. в",
    "Configure which model to use for image generation.": "Выберите модель для генерации изображений.",
    "Confirm new password": "Подтвердите новый пароль", "Connection mode": "Режим подключения",
    "Controls": "Управление", "Controls for the agent tool loop.": "Управление циклом инструментов агента.",
    "Controls how fired note reminders are delivered.": "Определяет, как доставляются напоминания заметок.",
    "Copy Chat": "Копировать чат", "Create a new persona": "Создать новую персону",
    "Creative": "Творчески", "Current password": "Текущий пароль", "Custom": "Свой",
    "Custom Fonts": "Свои шрифты", "Custom URL": "Свой URL", "Customize": "Настроить",
    "Danger Zone": "Опасная зона", "Dark": "Тёмная", "Data Backup": "Резервная копия данных",
    "Deep Research": "Глубокое исследование",
    "Deep Research active — click to deactivate": "Глубокое исследование активно — нажмите, чтобы отключить",
    "Deep Research runtime settings. Default Model is picked in": "Параметры глубокого исследования. Модель по умолчанию выбирается в",
    "Default": "По умолчанию", "Default (warm, neutral)": "По умолчанию (тёплый, нейтральный)",
    "Default Chat Model": "Модель чата по умолчанию", "Default Themes": "Стандартные темы",
    "Delete": "Удалить", "Delete All": "Удалить всё", "Delete all calendar": "Удалить весь календарь",
    "Delete all chats": "Удалить все чаты", "Delete all documents": "Удалить все документы",
    "Delete all gallery": "Удалить всю галерею", "Delete all memory": "Удалить всю память",
    "Delete all notes": "Удалить все заметки", "Delete all skills": "Удалить все навыки",
    "Delete all tasks": "Удалить все задачи", "Delete every category": "Удалить все категории",
    "Delete everything": "Удалить всё", "Delete non passing": "Удалить непрошедшие",
    "Delete selected": "Удалить выбранные", "Delete session": "Удалить сессию",
    "Delete this persona and its memories": "Удалить эту персону и её память", "Density": "Плотность",
    "Disabled": "Отключено", "Document Editor": "Редактор документов", "Documents": "Документы",
    "Drafts only": "Только черновики",
    "Drops `data/skills/` (all SKILL.md files). Memory not affected.": "Удаляет `data/skills/` (все файлы SKILL.md). Память не затрагивается.",
    "DuckDuckGo (free, no key)": "DuckDuckGo (бесплатно, без ключа)",
    "Edit persona settings here →": "Изменить настройки персоны здесь →", "Effect color": "Цвет эффекта",
    "Email": "Почта", "Email Accounts": "Почтовые аккаунты", "Email Safety": "Безопасность почты",
    "Email Tasks": "Почтовые задачи",
    "Enable Nobody mode — no memory, no history saved": "Включить режим «Никто» — без памяти и сохранения истории",
    "Enable or disable tools available to the AI agent.": "Включайте и отключайте инструменты, доступные ИИ-агенту.",
    "Endpoint": "Эндпоинт", "Enter custom value": "Введите своё значение",
    "Enter session name": "Введите название сессии",
    "Every document and version. Drafts, exports, library — all gone.": "Все документы и версии. Черновики, экспорты, библиотека — всё будет удалено.",
    "Every image record and the upload directory on disk.": "Все записи изображений и каталог загрузок на диске.",
    "Every note, todo, and checklist.": "Все заметки, задачи и чек-листы.",
    "Every scheduled task and its run history (Tasks tool).": "Все запланированные задачи и история их выполнения.",
    "Every session, message, and chat history. Documents/notes/etc. stay.": "Все сессии, сообщения и история чатов. Документы/заметки и пр. сохраняются.",
    "Export": "Экспорт", "Export Data": "Экспорт данных", "Export all memories as JSON": "Экспортировать всю память в JSON",
    "Export current colors as JSON": "Экспортировать текущие цвета в JSON", "Extract Parallel": "Параллельное извлечение",
    "Extract Timeout": "Таймаут извлечения", "Extract from Sent (15 emails)": "Извлечь из «Отправленных» (15 писем)",
    "Extract memories from this session": "Извлечь память из этой сессии",
    "Fade this window to preview the page behind it": "Сделать окно полупрозрачным, чтобы видеть страницу за ним",
    "Fallbacks": "Резервные варианты", "Fill the default Ollama endpoint": "Заполнить эндпоинт Ollama по умолчанию",
    "Font": "Шрифт", "Font & Layout": "Шрифт и оформление", "Frosted": "Матовый",
    "Full-width chat": "Чат на всю ширину", "Gallery": "Галерея", "Generate": "Сгенерировать",
    "Give your persona a name...": "Дайте персоне имя...", "Google PSE engine ID": "ID движка Google PSE",
    "Grant full admin access": "Предоставить полный доступ администратора", "Group": "Группировать",
    "Group Chat active — click to deactivate": "Групповой чат активен — нажмите, чтобы отключить",
    "Hamburger menu": "Меню-гамбургер", "Harmony": "Гармония", "High (best quality)": "Высокое (лучшее качество)",
    "How": "Как", "How many web search results to fetch per query": "Сколько результатов веб-поиска получать на запрос",
    "How you're reminded": "Как вы получаете напоминания", "How — the approach or steps": "Как — подход или шаги",
    "Image": "Изображение", "Image Generation": "Генерация изображений", "Import": "Импорт",
    "Import Data": "Импорт данных", "Import URL": "URL для импорта",
    "Import a skill from GitHub or": "Импортировать навык из GitHub или", "Import a theme from JSON": "Импортировать тему из JSON",
    "Import memories from a file": "Импортировать память из файла", "Import skill from URL": "Импортировать навык по URL",
    "Include memories in chat context": "Включать память в контекст чата", "Incognito Mode": "Режим инкогнито",
    "Initializing logs terminal viewer...": "Инициализация просмотра логов...", "Inject": "Внедрить",
    "Inject Skills": "Внедрять навыки", "Inject relevant skills into chat context": "Внедрять подходящие навыки в контекст чата",
    "Input Bg": "Фон поля ввода", "Input Border": "Граница поля ввода", "Integration": "Интеграция",
    "Integrations": "Интеграции", "Intensity": "Интенсивность", "Interface language": "Язык интерфейса",
    "Keyboard Shortcuts": "Горячие клавиши", "Larger": "Крупнее", "Last Active": "По активности",
    "Last used": "Последнее использование", "Library": "Библиотека", "Light": "Светлая",
    "Live diagnostic logs and system output from the Odysseus process.": "Живые диагностические логи и системный вывод процесса Odysseus.",
    "Loading...": "Загрузка...", "Local (Kokoro-82M)": "Локально (Kokoro-82M)",
    "Logo & tips on empty chat": "Логотип и подсказки на пустом чате", "Low (fastest, cheapest)": "Низкое (быстрее и дешевле всего)",
    "Manage Chats (Library)": "Управление чатами (Библиотека)", "Manage email background tasks in Tasks.": "Управляйте фоновыми почтовыми задачами в «Задачах».",
    "Max Tokens": "Макс. токенов", "Max skills per request": "Макс. навыков на запрос",
    "Max skills to inject": "Макс. навыков для внедрения", "Max steps per message": "Макс. шагов на сообщение",
    "Medium (default)": "Среднее (по умолчанию)", "Memories": "Память", "Memory": "Память",
    "Memory category": "Категория памяти", "Message Odysseus...": "Сообщение для Odysseus...",
    "Message input": "Поле ввода сообщения", "Minimum confidence": "Минимальная уверенность",
    "Mode": "Режим", "Mode switcher": "Переключатель режима", "Model": "Модель",
    "Model Defaults": "Модели по умолчанию", "Model name & export above chat": "Имя модели и экспорт над чатом",
    "Model selector & quick-chat": "Выбор модели и быстрый чат",
    "Model used for Deep Research, more settings under": "Модель для глубокого исследования, больше настроек в",
    "Models": "Модели", "Monochromatic": "Монохромные", "Monospace": "Моноширинный",
    "More": "Ещё", "More Tools": "Ещё инструменты", "More options": "Больше параметров",
    "More tools": "Ещё инструменты", "Most used": "Часто используемые", "Name": "Название",
    "New Chat": "Новый чат", "New chat": "Новый чат", "New document": "Новый документ",
    "New memory text": "Текст новой записи памяти", "New password": "Новый пароль",
    "Newest": "Сначала новые", "Newest First": "Сначала новые", "No API endpoints yet.": "Пока нет API-эндпоинтов.",
    "No limit": "Без ограничения", "No memory, no history saved": "Без памяти, история не сохраняется",
    "Nobody": "Никто", "Nobody mode active — click to deactivate": "Режим «Никто» активен — нажмите, чтобы отключить",
    "Notes": "Заметки", "Odysseus Logo": "Логотип Odysseus", "Oldest": "Сначала старые",
    "Open Integrations": "Открыть интеграции", "Open Tasks": "Открыть задачи", "Open email inbox": "Открыть входящие",
    "Open signup": "Открыть регистрацию", "OpenDyslexic (dyslexia-friendly)": "OpenDyslexic (для дислексии)",
    "Optional — write the reminder in the voice of a saved character": "Необязательно — напишите напоминание голосом сохранённого персонажа",
    "Or create a skill by hand — title, what it solves, and an approach.": "Или создайте навык вручную — название, что решает и подход.",
    "Overflow menu": "Меню переполнения", "Panel": "Панель", "Password": "Пароль",
    "Paste endpoint URL, e.g. http://localhost:11434/v1": "Вставьте URL эндпоинта, напр. http://localhost:11434/v1",
    "Paste theme JSON here...": "Вставьте JSON темы сюда...", "Persona": "Персона",
    "Persona active — click to deactivate": "Персона активна — нажмите, чтобы отключить",
    "Persona picker & system prompt": "Выбор персоны и системный промпт", "Personas": "Персоны",
    "Pick provider": "Выберите провайдера", "Precise / Code": "Точно / Код", "Prefix": "Префикс",
    "Preview": "Предпросмотр", "Prompt": "Промпт", "Provider": "Провайдер",
    "Providers tried in order when the primary fails or hits a rate limit": "Провайдеры пробуются по порядку при сбое основного или достижении лимита",
    "Proxy": "Прокси", "Public App URL": "Публичный URL приложения", "Publish selected drafts": "Опубликовать выбранные черновики",
    "Published only": "Только опубликованные", "Quality": "Качество",
    "RAG active — click to deactivate": "RAG активен — нажмите, чтобы отключить",
    "Re-test every endpoint and refresh online status": "Перепроверить все эндпоинты и обновить статус",
    "Recent": "Недавние", "Refresh model picker": "Обновить список моделей", "Registration": "Регистрация",
    "Reminders": "Напоминания", "Remove all endpoints currently marked offline": "Удалить все эндпоинты, отмеченные как офлайн",
    "Remove this session permanently": "Удалить эту сессию навсегда", "Rename": "Переименовать",
    "Rename Session": "Переименовать сессию", "Rename session": "Переименовать сессию", "Research": "Исследование",
    "Research Model": "Модель исследования", "Reset Chat Area to defaults": "Сбросить область чата к значениям по умолчанию",
    "Reset Chat Bar to defaults": "Сбросить панель чата к значениям по умолчанию", "Reset Sidebar to defaults": "Сбросить боковую панель к значениям по умолчанию",
    "Reset color": "Сбросить цвет", "Reset shortcuts to defaults": "Сбросить горячие клавиши",
    "Reset this color": "Сбросить этот цвет", "Reset this section to defaults": "Сбросить этот раздел к значениям по умолчанию",
    "Reset to Default": "Сбросить к значениям по умолчанию", "Reset to default": "Сбросить к значениям по умолчанию",
    "Reset to text color": "Сбросить к цвету текста", "Results per query": "Результатов на запрос",
    "Run a test query against the configured provider": "Выполнить тестовый запрос к выбранному провайдеру",
    "Same as chat": "Как в чате", "Same as web search": "Как в веб-поиске", "Save": "Сохранить",
    "Save / Share": "Сохранить / Поделиться", "Save to Documents": "Сохранить в документы",
    "Scan your network for running model servers": "Найти в сети запущенные серверы моделей", "Scroll to bottom": "Прокрутить вниз",
    "Search": "Поиск", "Search API used for web search and deep research.": "Поисковый API для веб-поиска и глубокого исследования.",
    "Search conversations (Ctrl+K)": "Поиск по чатам (Ctrl+K)", "Search conversations...": "Поиск по чатам...",
    "Search logs...": "Поиск по логам...", "Search memories": "Поиск по памяти", "Search memories…": "Поиск по памяти…",
    "Search models": "Поиск моделей", "Search models...": "Поиск моделей...", "Search skills": "Поиск навыков",
    "Search skills…": "Поиск навыков…", "Search →": "Поиск →", "Select": "Выбрать", "Select model": "Выберите модель",
    "Select multiple memories": "Выбрать несколько записей", "Select multiple skills": "Выбрать несколько навыков",
    "Select persona...": "Выберите персону...", "Send Btn": "Кнопка отправки", "Send Hover": "Наведение на отправку",
    "Send from": "Отправить от", "Send to": "Отправить кому", "Sensitive Blur": "Размытие конфиденциального",
    "Sequential": "Последовательно", "Session Header": "Заголовок сессии", "Session Name": "Название сессии",
    "Set to 0 to disable skill injection.": "Установите 0, чтобы отключить внедрение навыков.", "Settings": "Настройки",
    "Settings Button": "Кнопка настроек", "Share defaults with users": "Поделиться настройками по умолчанию с пользователями",
    "Shell Access": "Доступ к Shell", "Shell access": "Доступ к Shell", "Shortcuts": "Горячие клавиши",
    "Show <think> collapsible bars": "Показывать сворачиваемые блоки <think>", "Show / hide the API key field": "Показать / скрыть поле API-ключа",
    "Show sidebar": "Показать панель", "Sidebar": "Боковая панель", "Size": "Размер",
    "Skill import URL": "URL импорта навыка", "Skill title": "Название навыка", "Skills": "Навыки",
    "Solid": "Сплошной", "Sort memories": "Сортировать память", "Sort models": "Сортировать модели",
    "Sort sessions": "Сортировать сессии", "Sorting...": "Сортировка...", "Spacious": "Просторно",
    "Speed": "Скорость", "Start": "Старт", "Strip emojis from AI replies": "Убирать эмодзи из ответов ИИ",
    "Suffix": "Суффикс", "Switch model": "Сменить модель", "System": "Система", "System prompt": "Системный промпт",
    "TTS Mode": "Режим TTS", "Tags": "Теги", "Tasks": "Задачи", "Temperature": "Температура", "Test": "Тест",
    "Test every skill, auto-fix the weak ones, flag what still fails": "Протестировать все навыки, исправить слабые, отметить нерешённые",
    "Text": "Текст", "Text size": "Размер текста", "Text to Speech": "Синтез речи", "Text-only Emojis": "Текстовые эмодзи",
    "The model used when creating a new chat session.": "Модель, используемая при создании новой сессии чата.",
    "Theme": "Тема", "Theme name...": "Название темы...", "Themes": "Темы", "Thinking Process": "Процесс размышления",
    "Tidy": "Прибраться", "Timeout": "Таймаут", "Title": "Заголовок", "Toggle On": "Переключатель вкл.",
    "Toggle sidebar": "Переключить панель", "Tool call limit": "Лимит вызовов инструментов", "Tools": "Инструменты",
    "Triadic": "Триадные", "Two-Factor Authentication": "Двухфакторная аутентификация", "Update Password": "Обновить пароль",
    "Use the full window width (desktop)": "Использовать всю ширину окна (десктоп)",
    "Use the utility model to write reminder messages": "Использовать служебную модель для текста напоминаний",
    "User": "Пользователь", "User Chat Bubble": "Пузырь чата пользователя", "Username": "Имя пользователя",
    "Users": "Пользователи", "Utility Model": "Служебная модель", "Voice": "Голос", "Web Search": "Веб-поиск",
    "Web search": "Веб-поиск", "Welcome Message": "Приветственное сообщение", "Welcome,": "Добро пожаловать,",
    "When on, agent": "Когда включено, агент", "When to use": "Когда использовать", "When to use this skill": "Когда использовать этот навык",
    "Whole section (header + all tools)": "Весь раздел (заголовок + все инструменты)", "Workspace": "Рабочее пространство",
    "Workspace - click to clear": "Рабочее пространство — нажмите, чтобы очистить",
    "Write rough notes and click Expand, or leave empty": "Напишите черновые заметки и нажмите «Развернуть», или оставьте пустым",
    "Writing Style": "Стиль письма", "Your Themes": "Ваши темы", "manage": "управление", "model name": "имя модели",
    "ntfy topic": "тема ntfy", "to get started.": "чтобы начать.", "type /setup": "введите /setup",
    "and reload — they'll appear in the Font dropdown above.": "и перезагрузите — они появятся в списке шрифтов выше.",
    "— comma-separated, e.g. python, build, vllm": "— через запятую, напр. python, build, vllm",
    "— e.g. GitHub tree link to a skill folder": "— напр. ссылка на папку навыка в GitHub",
    "— the approach, steps, commands, or rules to follow": "— подход, шаги, команды или правила",
    "— what problem does this skill solve?": "— какую проблему решает этот навык?"
  };

  // Batch 2: strings extracted from the JS modules (email, image editor, documents,
  // tasks, calendar, cookbook, research, notes, memory, admin). Proper nouns
  // (providers, model formats, quant names), hotkeys and concatenation fragments
  // are intentionally absent so they stay verbatim.
  Object.assign(PHRASES, {
    "Cancel": "Отмена", "Delete": "Удалить", "Select": "Выбрать", "Remove": "Убрать",
    "Close": "Закрыть", "Save": "Сохранить", "Copy": "Копировать", "Archive": "Архивировать",
    "Actions": "Действия", "None": "Нет", "Recent": "Недавние", "Model": "Модель",
    "Cancel (Esc)": "Отмена (Esc)", "Auto": "Авто", "Name": "Имя", "Reply": "Ответить",
    "More": "Ещё", "Failed to load": "Не удалось загрузить", "All": "Все", "Oldest": "Сначала старые",
    "Edit": "Изменить", "Summary": "Сводка", "Search": "Поиск", "Research": "Исследование",
    "Output": "Вывод", "More actions": "Ещё действия", "Forward": "Переслать",
    "Failed to save preference": "Не удалось сохранить настройку", "Shuffle": "Перемешать",
    "Settings": "Настройки", "Download": "Скачать", "Default": "По умолчанию", "Copied": "Скопировано",
    "Context": "Контекст", "Undo": "Отменить", "Sequential": "Последовательно", "Run": "Запустить",
    "Restore": "Восстановить", "Renamed": "Переименовано", "Refresh": "Обновить", "Parallel": "Параллельно",
    "Open": "Открыть", "Note": "Заметка", "No results found": "Ничего не найдено", "New": "Создать",
    "Most messages": "Больше всего сообщений", "Hide Cc/Bcc": "Скрыть копию/скрытую копию",
    "Failed to delete": "Не удалось удалить", "Documents": "Документы", "Dismiss": "Закрыть",
    "Click to fill in chat": "Нажмите, чтобы подставить в чат", "Chats": "Чаты", "Apply": "Применить",
    "Add": "Добавить", "You": "Вы", "What this does": "Что это делает", "Weekly": "Еженедельно",
    "Tools": "Инструменты", "Today": "Сегодня", "Tidy": "Прибраться", "Test": "Тест",
    "Summarize": "Кратко изложить", "Strength": "Сила", "Softness": "Мягкость",
    "Show recipients": "Показать получателей", "Session": "Сессия",
    "Select an unlocked layer": "Выберите разблокированный слой", "Run preview": "Запустить предпросмотр",
    "Reply all": "Ответить всем", "Reply All": "Ответить всем", "Rename": "Переименовать",
    "Remove pane": "Убрать панель", "Remind me": "Напомнить мне", "Re-roll": "Перегенерировать",
    "Prompt": "Промпт", "Previous": "Назад", "Password": "Пароль", "Opacity": "Прозрачность",
    "Notes": "Заметки", "No models available": "Нет доступных моделей",
    "No integrations configured": "Интеграции не настроены", "Next": "Далее", "Monthly": "Ежемесячно",
    "Models": "Модели", "Minimize": "Свернуть", "Minimise": "Свернуть", "Mark done": "Отметить выполненным",
    "Load more": "Загрузить ещё", "Launch": "Запустить", "Item...": "Элемент...", "Installed": "Установлено",
    "Flow": "Поток", "Feather": "Растушёвка", "Failed to load tools": "Не удалось загрузить инструменты",
    "Failed to load models": "Не удалось загрузить модели", "Failed to create reminder": "Не удалось создать напоминание",
    "Failed to create document": "Не удалось создать документ", "Failed to archive": "Не удалось архивировать",
    "Expand": "Развернуть", "Edit in Settings": "Изменить в настройках", "Edge stroke": "Обводка края",
    "Dependencies": "Зависимости", "Deleted": "Удалено", "Delete?": "Удалить?",
    "Delete this session?": "Удалить эту сессию?", "Delete this research?": "Удалить это исследование?",
    "Delete this document?": "Удалить этот документ?", "Delete selected": "Удалить выбранные",
    "Deep Research": "Глубокое исследование", "Daily": "Ежедневно", "Copy all items": "Копировать всё",
    "Clear": "Очистить", "Archived": "В архиве", "AI reply": "Ответ ИИ", "Zoom out": "Уменьшить",
    "Zoom in": "Увеличить", "Your Name": "Ваше имя", "Yearly": "Ежегодно", "Width": "Ширина",
    "Version history": "История версий", "Uses model": "Использует модель", "Username": "Имя пользователя",
    "Unlock": "Разблокировать", "Unfavorite before deleting": "Уберите из избранного перед удалением",
    "Unarchived": "Извлечено из архива", "Unarchive": "Извлечь из архива", "Type": "Тип",
    "Transform": "Трансформировать", "To-do": "Задача", "To and body are required": "Нужны получатель и текст",
    "Title": "Заголовок", "Time": "Время", "Task completed": "Задача выполнена", "Take a note...": "Запишите заметку...",
    "Stop": "Остановить", "Start": "Старт", "Speed": "Скорость", "Sort tasks": "Сортировать задачи",
    "Soften the selection edge — feathers the mask alpha.": "Смягчить край выделения — растушёвывает альфу маски.",
    "Show only emails with attachments": "Только письма с вложениями",
    "Shorter, faster draft": "Короче и быстрее", "Session deleted": "Сессия удалена",
    "Server URL": "URL сервера", "Serve": "Запустить", "Selection added to mask": "Выделение добавлено в маску",
    "Select for bulk actions": "Выбрать для массовых действий", "Select emails first": "Сначала выберите письма",
    "Scroll right": "Прокрутить вправо", "Scroll left": "Прокрутить влево", "Schedule": "Расписание",
    "Scan / Download": "Сканировать / Скачать", "Saved to memory": "Сохранено в память",
    "Save schedule": "Сохранить расписание", "Run now": "Запустить сейчас", "Run / Preview": "Запуск / Предпросмотр",
    "Rounds": "Раунды", "Rotate failed": "Не удалось повернуть", "Reverted to default": "Сброшено к значению по умолчанию",
    "Retry": "Повторить", "Restored unsaved changes": "Восстановлены несохранённые изменения",
    "Reset this slider": "Сбросить этот ползунок", "Reply body is empty": "Текст ответа пуст",
    "Remove this chip": "Убрать этот тег", "Remove tag": "Убрать тег", "Reminders": "Напоминания",
    "Reinstall": "Переустановить", "Reconnect": "Переподключить", "Preset": "Пресет", "Photos": "Фото",
    "Permissions": "Права", "Nobody": "Никто", "No subfolders": "Нет подпапок",
    "No speech detected": "Речь не распознана", "No models": "Нет моделей",
    "No model info on this task": "Нет данных о модели для этой задачи",
    "No log content available yet": "Логи пока недоступны", "No events": "Нет событий",
    "No default chat model configured": "Модель чата по умолчанию не задана",
    "No cached models found": "Кэшированные модели не найдены", "No archived sessions": "Нет архивных сессий",
    "New event": "Новое событие", "Multi-step web research with an LLM-in-the-loop agent": "Многошаговое веб-исследование с агентом на основе LLM",
    "More launch actions": "Ещё действия запуска", "Message deleted": "Сообщение удалено",
    "Merge down": "Объединить вниз", "Merge all": "Объединить всё", "Login": "Вход", "Location": "Местоположение",
    "Loading...": "Загрузка...", "Loading search providers…": "Загрузка поисковых провайдеров…",
    "Library, Research": "Библиотека, Исследование", "Library": "Библиотека",
    "Layer merged down": "Слой объединён вниз", "Invert selection (Ctrl+Alt+I)": "Инвертировать выделение (Ctrl+Alt+I)",
    "Invalid size": "Недопустимый размер", "Input": "Ввод", "Import .ics": "Импорт .ics", "Import": "Импорт",
    "Image": "Изображение", "How inpaint works": "Как работает inpaint", "History": "История",
    "Hide panel": "Скрыть панель", "Height": "Высота", "Header": "Заголовок", "Has attachments": "Есть вложения",
    "Harmonize": "Гармонизировать", "Gallery": "Галерея", "Filter…": "Фильтр…", "Favorites": "Избранное",
    "Favorite": "В избранное", "Failed to unarchive": "Не удалось извлечь из архива",
    "Failed to set cover": "Не удалось задать обложку", "Failed to save custom preset": "Не удалось сохранить пресет",
    "Failed to save contact": "Не удалось сохранить контакт", "Failed to save OCR text": "Не удалось сохранить текст OCR",
    "Failed to load preview": "Не удалось загрузить предпросмотр", "Failed to delete session": "Не удалось удалить сессию",
    "Failed to create zip": "Не удалось создать zip", "Failed to copy chat": "Не удалось скопировать чат",
    "Export failed": "Не удалось экспортировать", "Export PDF": "Экспорт PDF", "Export": "Экспорт",
    "Expand (+) or contract (−) the selection before baking.": "Расширьте (+) или сузьте (−) выделение перед применением.",
    "Event": "Событие", "Eraser": "Ластик", "Email": "Почта",
    "Draw the area you want to inpaint first": "Сначала выделите область для inpaint",
    "Drag to resize": "Тяните для изменения размера", "Drag": "Тянуть", "Downloaded": "Скачано",
    "Document deleted": "Документ удалён", "Disabled": "Отключено", "Delete this note?": "Удалить эту заметку?",
    "Delete this chat?": "Удалить этот чат?", "Delete selected pixels from the layer": "Удалить выбранные пиксели со слоя",
    "Delete project": "Удалить проект", "Delete forever": "Удалить навсегда", "Custom (no preset)": "Свой (без пресета)",
    "Create": "Создать", "Could not create agent session": "Не удалось создать сессию агента",
    "Copy token": "Копировать токен", "Copy setup": "Копировать настройку", "Copy failed": "Не удалось скопировать",
    "Copy email": "Копировать письмо", "Copy command": "Копировать команду", "Copy URL": "Копировать URL",
    "Configure": "Настроить", "Color": "Цвет", "Code": "Код", "Close the edit tab first": "Сначала закройте вкладку редактирования",
    "Close inpaint panel": "Закрыть панель inpaint", "Close edit": "Закрыть редактирование", "Clone": "Клонировать",
    "Click to rename": "Нажмите, чтобы переименовать", "Click to launch setup": "Нажмите, чтобы запустить настройку",
    "Chat": "Чат", "Brush": "Кисть", "Blind Mode": "Слепой режим", "Basic": "Базовый", "Authorize": "Авторизовать",
    "Attach photo": "Прикрепить фото", "Analysis": "Анализ", "All sources": "Все источники", "All day": "Весь день",
    "Albums": "Альбомы", "Add context (optional)": "Добавить контекст (необязательно)", "Active": "Активно",
    "Action": "Действие", "(optional — leave blank to use email)": "(необязательно — оставьте пустым, чтобы использовать e-mail)",
    "Your calendars": "Ваши календари", "You have edited this built-in capability": "Вы изменили эту встроенную возможность",
    "Write your note…": "Напишите заметку…", "Workspace cleared": "Рабочее пространство очищено", "Winner!": "Победитель!",
    "Window": "Окно", "Whole repo": "Весь репозиторий", "Which one": "Какой именно",
    "What to fill the masked area with...": "Чем заполнить выделенную область...",
    "Welcome to Theme.": "Добро пожаловать в Темы.", "Welcome to Tasks.": "Добро пожаловать в Задачи.",
    "Welcome to Settings.": "Добро пожаловать в Настройки.", "Welcome to Library!": "Добро пожаловать в Библиотеку!",
    "Welcome to Gallery.": "Добро пожаловать в Галерею.", "Welcome to Deep Research!": "Добро пожаловать в Глубокое исследование!",
    "Welcome to Cookbook!": "Добро пожаловать в Cookbook!", "Weekdays": "Будни", "Weekday": "День недели",
    "Week starts on": "Неделя начинается с", "Webhook URL will be generated when the task is saved.": "URL вебхука будет создан при сохранении задачи.",
    "Webhook URL": "URL вебхука", "Webhook": "Вебхук", "Visual report": "Визуальный отчёт", "Vision text": "Текст vision",
    "Visible layers merged": "Видимые слои объединены", "View thinking process": "Показать процесс размышления",
    "View download source on HuggingFace": "Источник загрузки на HuggingFace", "View archive": "Открыть архив",
    "Version History": "История версий", "Verify & Enable": "Проверить и включить", "Vaultwarden (Password Vault)": "Vaultwarden (хранилище паролей)",
    "VRAM per GPU": "VRAM на GPU", "Utility Model": "Служебная модель", "Using manual hardware": "Используется ручная конфигурация железа",
    "Uses the fuller reply context": "Использует более полный контекст ответа", "Used when nothing else is selected": "Используется, когда ничего не выбрано",
    "Use this folder": "Использовать эту папку", "Use session default": "Использовать значение сессии по умолчанию",
    "Usage": "Использование", "Urgent": "Срочно", "Upload photos or videos": "Загрузить фото или видео",
    "Upload here": "Загрузить сюда", "Upload failed": "Не удалось загрузить", "Upload album": "Загрузить альбом",
    "Upload": "Загрузить", "Update source + rebuild": "Обновить исходник + пересобрать", "Update": "Обновить",
    "Untitled photo (press Enter to save)": "Без названия (Enter — сохранить)", "Untitled": "Без названия", "Until": "До",
    "Unstar before deleting": "Уберите из избранного перед удалением", "Unread": "Непрочитанные",
    "Unlink from chat (kept in the Library)": "Отвязать от чата (останется в Библиотеке)", "Unlink": "Отвязать",
    "Unified": "Единый", "Unfavorited": "Убрано из избранного", "Undone": "Отменено", "Undo failed": "Не удалось отменить",
    "Undo (Ctrl+Z)": "Отменить (Ctrl+Z)", "Unarchive note": "Извлечь заметку из архива", "Unanswered": "Без ответа",
    "Type or paste a folder path, then press Enter": "Введите или вставьте путь к папке и нажмите Enter",
    "Type a tag and press Enter to add it": "Введите тег и нажмите Enter", "Type /setup for Local models or API setup.": "Введите /setup для настройки локальных моделей или API.",
    "Trigger": "Триггер", "Trending models that fit your hardware": "Популярные модели под ваше железо",
    "Transport": "Транспорт", "Transform applied": "Трансформация применена", "Transcribing...": "Расшифровка...",
    "Transcribed": "Расшифровано", "Total RAM": "Всего RAM", "Total": "Всего", "Tomorrow 9am": "Завтра в 9:00",
    "Tolerance": "Допуск", "Token stored": "Токен сохранён", "Token name": "Имя токена", "Token": "Токен",
    "Toggle view": "Переключить вид", "Toggle selection overlay": "Переключить наложение выделения",
    "Toggle multi-select": "Переключить множественный выбор", "Toggle Research and send to re-run": "Переключите «Исследование» и отправьте для повтора",
    "Toggle PDF view": "Переключить просмотр PDF", "Toggle": "Переключить", "Todo": "Задача", "Today is": "Сегодня",
    "To": "Кому", "Title required": "Нужен заголовок", "Timezone": "Часовой пояс",
    "Tidy: remove empty / junk / duplicate documents": "Уборка: убрать пустые / мусорные / дублирующие документы",
    "Tidy: delete research with no sources or empty reports": "Уборка: удалить исследования без источников или с пустыми отчётами",
    "Tidy failed": "Уборка не удалась", "Tidy failed — check console": "Уборка не удалась — проверьте консоль",
    "This is your document editor.": "Это ваш редактор документов.", "Thinking…": "Размышляю…", "Tasks": "Задачи",
    "Task updated": "Задача обновлена", "Task stopped": "Задача остановлена", "Task resumed": "Задача возобновлена",
    "Task paused": "Задача приостановлена", "Task deleted": "Задача удалена", "Task created": "Задача создана",
    "Tags": "Теги", "Tag(s) — space-separated": "Теги — через пробел", "Sync now": "Синхронизировать сейчас", "Sync": "Синхронизация",
    "Switch the document to markdown before inserting images": "Переключите документ в markdown перед вставкой изображений",
    "Sunday": "Воскресенье", "Summarize older messages to free up context": "Кратко изложить старые сообщения, чтобы освободить контекст",
    "Suggestions": "Предложения", "Suggested memories": "Предлагаемые записи памяти", "Subtract from selection (Alt)": "Вычесть из выделения (Alt)",
    "Submit": "Отправить", "Subject": "Тема", "Style prompt": "Промпт стиля", "Style applied": "Стиль применён",
    "Stroke size": "Размер обводки", "Stroke color": "Цвет обводки", "Strikethrough": "Зачёркнутый", "Strength help": "Справка по силе",
    "Stopped": "Остановлено", "Stop this task": "Остановить эту задачу", "Stop all running servers": "Остановить все запущенные серверы",
    "Stop all": "Остановить всё", "Status": "Статус", "Start this queued download now": "Запустить эту загрузку из очереди сейчас",
    "Start now in parallel, bypassing the queue": "Запустить сейчас параллельно, минуя очередь", "Start now": "Запустить сейчас",
    "Start Group Chat": "Начать групповой чат", "Standard": "Стандартный", "Spam": "Спам", "Source": "Источник",
    "Sorted": "Отсортировано", "Soft brush edge — blurs each stamp for a feathered fade.": "Мягкий край кисти — размывает каждый мазок для плавного перехода.",
    "Smoothness": "Сглаживание", "Skip already audited": "Пропустить уже проверенные", "Skip": "Пропустить", "Skills": "Навыки",
    "Skill deleted": "Навык удалён", "Skill added (draft)": "Навык добавлен (черновик)", "Size ↓": "Размер ↓", "Size ↑": "Размер ↑",
    "Size": "Размер", "Shuffle off": "Перемешивание выкл.", "Shuffle Pool": "Пул перемешивания", "Show unread emails": "Показать непрочитанные письма",
    "Show only goals": "Только цели", "Show only emails not marked as done (undone)": "Только письма, не отмеченные выполненными",
    "Show notes without tags": "Показать заметки без тегов", "Show more": "Показать ещё", "Show Odysseus reminder emails": "Показать письма-напоминания Odysseus",
    "Show Cc/Bcc": "Показать копию/скрытую копию", "Shortcuts reset to defaults": "Горячие клавиши сброшены", "Shortcuts": "Горячие клавиши",
    "Shortcut saved": "Сочетание сохранено", "Sharpen": "Резкость", "Shadows": "Тени",
    "Settings cog hidden — type /settings to bring it back.": "Шестерёнка настроек скрыта — введите /settings, чтобы вернуть.",
    "Set up SSH key for this server": "Настроить SSH-ключ для этого сервера", "Set hardware manually": "Задать железо вручную",
    "Set Up 2FA": "Настроить 2FA", "Set": "Задать", "Session restored": "Сессия восстановлена", "Session module not loaded": "Модуль сессий не загружен",
    "Session archived": "Сессия архивирована", "Serving which model?": "Какую модель запускаем?", "Servers": "Серверы",
    "Server not responding — it may have crashed": "Сервер не отвечает — возможно, он упал", "Server not found": "Сервер не найден",
    "Server name": "Имя сервера", "Server": "Сервер", "Sending": "Отправка", "Send signed reply": "Отправить подписанный ответ",
    "Send email (Ctrl+Enter)": "Отправить письмо (Ctrl+Enter)", "Send downloads here": "Отправлять загрузки сюда", "Send canceled": "Отправка отменена",
    "Send anyway": "Всё равно отправить", "Send": "Отправить", "Selection inverted": "Выделение инвертировано",
    "Selection inverted (converted to wand)": "Выделение инвертировано (преобразовано в волшебную палочку)", "Selection deleted": "Выделение удалено",
    "Selection copied to new layer": "Выделение скопировано в новый слой", "Selection": "Выделение", "Select workspace": "Выбрать рабочее пространство",
    "Select tasks": "Выбрать задачи", "Select sessions": "Выбрать сессии", "Select photos first": "Сначала выберите фото",
    "Select documents first": "Сначала выберите документы", "Select documents": "Выбрать документы", "Select at least 1 model": "Выберите хотя бы 1 модель",
    "Select an event": "Выберите событие", "Select an action": "Выберите действие", "Select albums first": "Сначала выберите альбомы",
    "Search text in this thread": "Поиск по этой переписке", "Search tasks…": "Поиск задач…", "Search research…": "Поиск исследований…",
    "Search projects…": "Поиск проектов…", "Search photos, tags...": "Поиск по фото, тегам...", "Search notes…": "Поиск заметок…",
    "Search models...": "Поиск моделей...", "Search engine": "Поисковая система", "Search contacts (name, email, phone, address)": "Поиск контактов (имя, e-mail, телефон, адрес)",
    "Search chats…": "Поиск по чатам…", "Search cached models…": "Поиск кэшированных моделей…", "Search by name or text": "Поиск по имени или тексту",
    "Search archive…": "Поиск по архиву…", "Search all events…": "Поиск по всем событиям…", "Search albums...": "Поиск альбомов...",
    "Seam fix": "Исправление шва", "Screenshot": "Скриншот", "Score": "Счёт", "Schedule Send...": "Запланировать отправку...",
    "Schedule Send": "Запланировать отправку", "Scanning...": "Сканирование...", "Saved working config": "Рабочая конфигурация сохранена",
    "Saved to presets": "Сохранено в пресеты", "Saved to documents": "Сохранено в документы", "Saved to contacts": "Сохранено в контакты",
    "Saved projects": "Сохранённые проекты", "Save this server": "Сохранить этот сервер", "Save project (.json)": "Сохранить проект (.json)",
    "Save over original": "Сохранить поверх оригинала", "Save options": "Параметры сохранения", "Save off": "Сохранение выкл.",
    "Save current preset": "Сохранить текущий пресет", "Save as copy": "Сохранить как копию", "Save as a new image in the gallery": "Сохранить как новое изображение в галерее",
    "Save Draft": "Сохранить черновик", "Save Config": "Сохранить конфигурацию", "Save (archive)": "Сохранить (архив)",
    "SSH setup command copied": "Команда настройки SSH скопирована", "SSH port (default 22)": "Порт SSH (по умолчанию 22)",
    "Running": "Выполняется", "Run this task again": "Запустить эту задачу снова", "Run the test again": "Запустить тест снова",
    "Run code": "Запустить код", "Rotated": "Повёрнуто", "Rotate right": "Повернуть вправо", "Rotate left": "Повернуть влево",
    "Rotate 90° counter-clockwise": "Повернуть на 90° против часовой", "Rotate 90° clockwise": "Повернуть на 90° по часовой",
    "Rotate -1°": "Повернуть на -1°", "Rotate +1°": "Повернуть на +1°", "Revoke": "Отозвать",
    "Retune selection while dragging tolerance": "Подстраивать выделение при изменении допуска", "Resumed previous edit": "Прежнее редактирование возобновлено",
    "Resumed draft": "Черновик возобновлён", "Restored unsaved note": "Восстановлена несохранённая заметка", "Response ready in": "Ответ готов за",
    "Rescan": "Пересканировать", "Report": "Отчёт", "Reply soon": "Скоро ответить", "Reply note saved": "Заметка к ответу сохранена",
    "Replace selection on each click": "Заменять выделение при каждом клике", "Repeat": "Повтор", "Rename failed": "Не удалось переименовать",
    "Remove tag filter": "Убрать фильтр по тегу", "Remove all AI-generated tags from every photo": "Убрать все ИИ-теги со всех фото",
    "Reminder": "Напоминание", "Remind me later": "Напомнить позже", "Reload PDF view": "Перезагрузить просмотр PDF",
    "Regenerate message": "Перегенерировать сообщение", "Refresh from database": "Обновить из базы данных", "Redo": "Повторить",
    "Recording...": "Запись...", "Recommend a small local model": "Порекомендовать небольшую локальную модель",
    "Recent task runs across all scheduled tasks.": "Недавние запуски по всем запланированным задачам.", "Rebuild": "Пересобрать",
    "Reasoning": "Рассуждение", "Rearrange disabled": "Перестановка отключена", "Random": "Случайно", "Quick presets": "Быстрые пресеты",
    "Quick add": "Быстро добавить", "Quant": "Квант", "Provider": "Провайдер", "Prompt is required": "Нужен промпт",
    "Prompt for this check-in": "Промпт для этой проверки", "Prompt copied!": "Промпт скопирован!", "Project saved": "Проект сохранён",
    "Project loaded": "Проект загружен", "Project": "Проект", "Product": "Продукт",
    "Probing models... this may take a while.": "Проверка моделей... это может занять время.", "Probe GPUs": "Опросить GPU",
    "Probe GPU memory and running GPU processes": "Опросить память GPU и запущенные процессы GPU", "Probe": "Опросить",
    "Previous email": "Предыдущее письмо", "Previous (←)": "Назад (←)", "Preview (Ctrl+Alt+M to toggle)": "Предпросмотр (Ctrl+Alt+M)",
    "Press": "Нажмите", "Preset saved": "Пресет сохранён", "Preparing signed reply…": "Готовлю подписанный ответ…", "Prep": "Подготовка",
    "Port": "Порт", "Please pick a time": "Выберите время", "Please enter a name for the session": "Введите название сессии",
    "Please enter a name for the AI": "Введите имя для ИИ", "Pick the GGUF quant, then press Download again.": "Выберите квант GGUF и нажмите «Скачать» снова.",
    "Pick from Gallery": "Выбрать из галереи", "Pick date and time": "Выберите дату и время", "Pick a folder": "Выберите папку",
    "Photo deleted": "Фото удалено", "Photo actions": "Действия с фото", "Phone (optional)": "Телефон (необязательно)", "Persona": "Персона",
    "Permanently delete all Odysseus reminder emails?": "Удалить навсегда все письма-напоминания Odysseus?",
    "Permanently delete Odysseus reminder emails": "Удалить навсегда письма-напоминания Odysseus", "People in this photo": "Люди на этом фото",
    "Peek": "Подсмотреть", "Paused - click to resume": "Приостановлено — нажмите, чтобы продолжить", "Pause all active tasks": "Приостановить все активные задачи",
    "Pause all": "Приостановить всё", "Pasted as new layer": "Вставлено как новый слой", "Passed an automated test": "Прошёл автоматический тест",
    "Part 1 done.": "Часть 1 готова.", "Params": "Параметры", "PDF": "PDF", "Overwrite the original image": "Перезаписать исходное изображение",
    "Outpaint": "Outpaint", "Or pick a specific time": "Или выберите конкретное время", "Or": "Или", "Options": "Параметры",
    "Optional packages that extend Odysseus capabilities.": "Дополнительные пакеты, расширяющие возможности Odysseus.",
    "Open the visual research report": "Открыть визуальный отчёт исследования", "Open in document editor": "Открыть в редакторе документов",
    "Open in Tasks": "Открыть в Задачах", "Open in OpenStreetMap": "Открыть в OpenStreetMap", "Open in Maps": "Открыть в картах",
    "Open in Launch": "Открыть в «Запуске»", "Open in Apple Maps": "Открыть в Apple Maps",
    "Open follow-up chat with this research as context": "Открыть чат с этим исследованием в контексте",
    "Open a previously-saved project file": "Открыть ранее сохранённый файл проекта", "Open Settings": "Открыть настройки",
    "Open Cookbook from the sidebar to serve an img2img model": "Откройте Cookbook на боковой панели, чтобы запустить img2img-модель",
    "Open Admin to add endpoints": "Откройте админку, чтобы добавить эндпоинты", "Only required for Login / Unlock": "Нужно только для входа / разблокировки",
    "Only admins can hide Settings.": "Скрывать настройки могут только администраторы.", "Ongoing Tasks": "Текущие задачи", "Once": "Один раз",
    "Ollama ready to test.": "Ollama готова к тесту.", "OK": "ОК", "Nth weekday of month": "N-й день недели месяца", "Nth weekday": "N-й день недели",
    "Notifications": "Уведомления", "Nothing to tidy": "Нечего убирать", "Nothing to solve — note is empty": "Нечего решать — заметка пуста",
    "Nothing to solve — item is empty": "Нечего решать — элемент пуст", "Nothing to save": "Нечего сохранять", "Nothing to copy yet": "Пока нечего копировать",
    "Not spam": "Не спам", "Not a project file": "Это не файл проекта", "No webhooks configured": "Вебхуки не настроены", "No users found": "Пользователи не найдены",
    "No useful information found in file.": "В файле не найдено полезной информации.", "No useful information detected.": "Полезная информация не обнаружена.",
    "No upcoming events": "Нет предстоящих событий", "No tools found": "Инструменты не найдены", "No tools": "Нет инструментов",
    "No text to rewrite": "Нет текста для переписывания", "No tasks yet. Create one to get started.": "Пока нет задач. Создайте первую.",
    "No sessions loaded": "Сессии не загружены", "No sender address": "Нет адреса отправителя", "No sender address available": "Адрес отправителя недоступен",
    "No selected non-passing skills": "Не выбрано непрошедших навыков", "No search providers configured": "Поисковые провайдеры не настроены",
    "No scheduled emails": "Нет запланированных писем", "No runs yet.": "Запусков пока нет.", "No research yet": "Исследований пока нет",
    "No research found": "Исследования не найдены", "No reminder": "Без напоминания", "No prompts for this type": "Нет промптов для этого типа",
    "No pricing data available": "Нет данных о ценах", "No previous version to compare": "Нет предыдущей версии для сравнения", "No preview available": "Предпросмотр недоступен",
    "No packages found": "Пакеты не найдены", "No offline endpoints — nothing to clear": "Нет офлайн-эндпоинтов — очищать нечего", "No notes yet": "Заметок пока нет",
    "No notes": "Нет заметок", "No models found": "Модели не найдены", "No microphone found.": "Микрофон не найден.", "No messages yet": "Сообщений пока нет",
    "No messages to copy": "Нет сообщений для копирования", "No memories to export": "Нет записей памяти для экспорта", "No matching tasks.": "Нет подходящих задач.",
    "No matching models": "Нет подходящих моделей", "No matching activity.": "Нет подходящей активности.", "No matches.": "Совпадений нет.",
    "No logs found matching current filters.": "Нет логов по текущим фильтрам.", "No images or videos in that folder": "В этой папке нет изображений или видео",
    "No images in gallery": "В галерее нет изображений", "No images found in that drop": "В перетащенном нет изображений", "No image found in clipboard": "В буфере обмена нет изображения",
    "No files indexed": "Файлы не проиндексированы", "No events match your search": "Нет событий по запросу", "No events match": "Нет подходящих событий",
    "No empty areas to outpaint — canvas is fully covered.": "Нет пустых областей для outpaint — холст полностью занят.", "No email accounts configured": "Почтовые аккаунты не настроены",
    "No documents yet": "Документов пока нет", "No documents match your search.": "Нет документов по запросу.", "No documents found": "Документы не найдены",
    "No directories indexed": "Каталоги не проиндексированы", "No contacts yet.": "Контактов пока нет.", "No commands match": "Нет подходящих команд",
    "No check-ins configured.": "Проверки не настроены.", "No chats found": "Чаты не найдены", "No character": "Без персонажа", "No changes": "Без изменений",
    "No changes from previous version": "Нет изменений от предыдущей версии", "No body": "Нет текста", "No attachments found": "Вложения не найдены",
    "No albums yet.": "Альбомов пока нет.", "No active layer for outpaint": "Нет активного слоя для outpaint", "No MCP servers configured": "MCP-серверы не настроены",
    "No GPU processes to clear": "Нет процессов GPU для очистки", "No GPU memory probe data available": "Нет данных опроса памяти GPU", "No API tokens": "Нет API-токенов",
    "No AI summary generated.": "Сводка ИИ не сгенерирована.", "Next step from every goal": "Следующий шаг по каждой цели", "Next email": "Следующее письмо",
    "Next (→)": "Далее (→)", "Newsletter": "Рассылка", "New item type": "Новый тип элемента", "New email": "Новое письмо",
    "New document — start typing": "Новый документ — начните печатать", "New document": "Новый документ", "New canvas...": "Новый холст...",
    "New canvas": "Новый холст", "New calendar": "Новый календарь", "New album": "Новый альбом", "Never used": "Не использовалось",
    "Need at least two visible layers to merge": "Для объединения нужно минимум два видимых слоя",
    "Need at least 2 participants — add models or characters": "Нужно минимум 2 участника — добавьте модели или персонажей",
    "Name your new album.": "Назовите новый альбом.", "Name this config so you can recall it later.": "Назовите конфигурацию, чтобы вернуться к ней позже.",
    "Name (optional, e.g. 'Full' or 'Initials')": "Имя (необязательно, напр. «Полное» или «Инициалы»)", "Name (optional)": "Имя (необязательно)",
    "My Service": "Мой сервис", "Moved to Trash": "Перемещено в корзину", "Move to folder": "Переместить в папку", "Most sources": "Больше всего источников",
    "Most edits": "Больше всего правок", "More send options": "Ещё параметры отправки", "More formatting": "Ещё форматирование",
    "Monday 9am": "Понедельник 9:00", "Monday": "Понедельник", "Model wait": "Ожидание модели", "Model refresh failed": "Не удалось обновить модель",
    "Model for inpainting": "Модель для inpaint", "Model for harmonize": "Модель для гармонизации", "Model for Style transfer": "Модель для переноса стиля",
    "Model endpoint": "Эндпоинт модели", "Model actions": "Действия с моделью", "Model Directory": "Каталог моделей", "Mode: Shuffle off": "Режим: перемешивание выкл.",
    "Mode: Save": "Режим: сохранение", "Mode: Blind": "Режим: слепой", "Minimize notes": "Свернуть заметки", "Midtones": "Полутона",
    "Microphone not supported in this browser.": "Микрофон не поддерживается в этом браузере.", "Microphone access denied. Check browser permissions.": "Доступ к микрофону запрещён. Проверьте разрешения браузера.",
    "Message sent": "Сообщение отправлено", "Message edited": "Сообщение изменено", "Message Stats": "Статистика сообщений", "Memory updated": "Память обновлена",
    "Memory text cannot be empty": "Текст памяти не может быть пустым", "Memory deleted": "Запись памяти удалена", "Memory added": "Запись памяти добавлена",
    "Max tokens": "Макс. токенов", "Max 8": "Макс. 8", "Max 8 models": "Макс. 8 моделей", "Max 5 saves per model": "Макс. 5 сохранений на модель",
    "Master Password": "Мастер-пароль", "Mask inverted": "Маска инвертирована", "Mask Brush Size": "Размер кисти маски", "Mask Brush": "Кисть маски",
    "Marketing": "Маркетинг", "Mark step done": "Отметить шаг выполненным", "Mark Unread": "Отметить непрочитанным", "Manual order": "Ручной порядок",
    "Make Default": "Сделать по умолчанию", "Logout": "Выйти", "Lock aspect ratio": "Зафиксировать пропорции", "Lock": "Заблокировать", "Local": "Локально",
    "Loading tools...": "Загрузка инструментов...", "Loading result...": "Загрузка результата...", "Loading packages...": "Загрузка пакетов...",
    "Loading models...": "Загрузка моделей...", "Live": "В реальном времени", "List": "Список", "Linked to a Cookbook scheduled task": "Привязано к запланированной задаче Cookbook",
    "Link text (optional)": "Текст ссылки (необязательно)", "Link": "Ссылка", "Line — click to cycle size": "Линия — нажмите для смены размера",
    "Line spacing": "Межстрочный интервал", "Limits": "Лимиты", "Layers": "Слои", "Layer pixels selected": "Пиксели слоя выделены", "Layer duplicated": "Слой продублирован",
    "Layer copied to clipboard": "Слой скопирован в буфер обмена", "Launch command copied": "Команда запуска скопирована", "Launch command": "Команда запуска",
    "Latest": "Последние", "Label": "Метка", "Kill": "Завершить", "Keyboard shortcuts (?)": "Горячие клавиши (?)", "Key": "Ключ", "Italic (Ctrl+I)": "Курсив (Ctrl+I)",
    "Invert mask": "Инвертировать маску", "Invalid width": "Недопустимая ширина", "Integrations": "Интеграции", "Instruction: text": "Инструкция: текст",
    "Installed — click for actions": "Установлено — нажмите для действий", "Install rembg": "Установить rembg", "Install build deps": "Установить зависимости сборки",
    "Install GPU wheel": "Установить GPU-сборку", "Install": "Установить", "Insert link": "Вставить ссылку", "Insert image": "Вставить изображение", "Insert": "Вставить",
    "Input white — drag": "Белая точка ввода — тяните", "Input black — drag": "Чёрная точка ввода — тяните", "Inpaint result failed to decode": "Не удалось декодировать результат inpaint",
    "Increase width": "Увеличить ширину", "Increase height": "Увеличить высоту", "Increase": "Увеличить", "Inbox": "Входящие", "In 3 hours": "Через 3 часа",
    "In 1 hour": "Через 1 час", "Import in Add tab": "Импорт во вкладке «Добавить»", "Import image as layer": "Импортировать изображение как слой",
    "Import files from disk": "Импортировать файлы с диска", "Import calendar": "Импортировать календарь", "Import an image as a new layer. Drag to position it.": "Импортировать изображение как новый слой. Перетащите для позиционирования.",
    "Image upload failed": "Не удалось загрузить изображение", "Image imported — drag to position": "Изображение импортировано — перетащите", "Image actions": "Действия с изображением",
    "Image Editor": "Редактор изображений", "HuggingFace Token": "Токен HuggingFace", "How-to": "Как сделать", "How clone works": "Как работает клонирование",
    "Horizontal rule": "Горизонтальная линия", "Homer, The Odyssey": "Гомер, «Одиссея»", "Hold Ctrl+Alt to flip temporarily for a single stroke.": "Удерживайте Ctrl+Alt, чтобы временно инвертировать для одного мазка.",
    "History — click an entry to jump to that state": "История — нажмите запись, чтобы перейти к этому состоянию", "Histogram": "Гистограмма", "Highlights": "Света",
    "Hide selection overlay": "Скрыть наложение выделения", "Hide mask": "Скрыть маску", "Hide email fields": "Скрыть поля письма", "Hide": "Скрыть", "Heading": "Заголовок",
    "Has expected answer": "Есть ожидаемый ответ", "Group chat ready —": "Групповой чат готов —", "Graceful (SIGTERM)": "Мягко (SIGTERM)", "Got it": "Понятно", "Go back": "Назад",
    "Generate now": "Сгенерировать сейчас", "Generate key": "Сгенерировать ключ", "Generate": "Сгенерировать", "Gamma — drag": "Гамма — тяните", "Games": "Игры",
    "GPU driver error": "Ошибка драйвера GPU", "Fuller reply with more context": "Более полный ответ с бо́льшим контекстом", "From earlier in this thread": "Из ранней части этой переписки",
    "From": "От", "Frequency": "Частота", "Found on selected server": "Найдено на выбранном сервере", "Fortune Cookie": "Печенье с предсказанием", "Format": "Формат",
    "Force (SIGKILL)": "Принудительно (SIGKILL)", "Font size": "Размер шрифта", "Flip vertical": "Отразить по вертикали", "Flip horizontal": "Отразить по горизонтали",
    "Flattened copy created": "Создана сведённая копия", "Flatten copy (keeps originals)": "Сведённая копия (оригиналы сохранятся)", "Flatten copy": "Сведённая копия",
    "Fit to view": "Вписать в окно", "Fit": "Вписать", "Find...": "Найти...", "Filters": "Фильтры", "Filtered to tag — click × to remove": "Отфильтровано по тегу — нажмите ×, чтобы убрать",
    "Filtered inline images / signature files": "Отфильтрованы встроенные изображения / файлы подписи", "Filter by serving engine": "Фильтр по движку запуска", "Filter activity…": "Фильтр активности…",
    "Filled": "Заполнено", "Fill the masked area with what your prompt describes.": "Заполнить выделенную область тем, что описывает промпт.", "File tools are": "Файловые инструменты",
    "File": "Файл", "Features": "Возможности", "Failed to update privilege": "Не удалось обновить права", "Failed to update pin": "Не удалось обновить закрепление",
    "Failed to update memory": "Не удалось обновить память", "Failed to update color": "Не удалось обновить цвет", "Failed to update album": "Не удалось обновить альбом",
    "Failed to start research": "Не удалось начать исследование", "Failed to set model": "Не удалось задать модель", "Failed to schedule": "Не удалось запланировать",
    "Failed to save": "Не удалось сохранить", "Failed to save urgency rules": "Не удалось сохранить правила срочности", "Failed to save to documents": "Не удалось сохранить в документы",
    "Failed to save tags": "Не удалось сохранить теги", "Failed to save drawing": "Не удалось сохранить рисунок", "Failed to restore version": "Не удалось восстановить версию",
    "Failed to restore session": "Не удалось восстановить сессию", "Failed to rename": "Не удалось переименовать", "Failed to rename user": "Не удалось переименовать пользователя",
    "Failed to remove tag": "Не удалось убрать тег", "Failed to remove item": "Не удалось убрать элемент", "Failed to pin": "Не удалось закрепить",
    "Failed to open archived session": "Не удалось открыть архивную сессию", "Failed to open PDF": "Не удалось открыть PDF", "Failed to load webhooks": "Не удалось загрузить вебхуки",
    "Failed to load versions": "Не удалось загрузить версии", "Failed to load version history": "Не удалось загрузить историю версий", "Failed to load users": "Не удалось загрузить пользователей",
    "Failed to load tokens": "Не удалось загрузить токены", "Failed to load server": "Не удалось загрузить сервер", "Failed to load search providers": "Не удалось загрузить поисковые провайдеры",
    "Failed to load result": "Не удалось загрузить результат", "Failed to load research": "Не удалось загрузить исследование", "Failed to load presets": "Не удалось загрузить пресеты",
    "Failed to load image": "Не удалось загрузить изображение", "Failed to load gallery image": "Не удалось загрузить изображение галереи", "Failed to load features": "Не удалось загрузить возможности",
    "Failed to load email": "Не удалось загрузить письмо", "Failed to load draft": "Не удалось загрузить черновик", "Failed to load documents": "Не удалось загрузить документы",
    "Failed to load contacts (check CardDAV config above).": "Не удалось загрузить контакты (проверьте настройки CardDAV выше).", "Failed to load clipboard image": "Не удалось загрузить изображение из буфера",
    "Failed to load archive": "Не удалось загрузить архив", "Failed to load SKILL.md": "Не удалось загрузить SKILL.md", "Failed to load PDF library": "Не удалось загрузить библиотеку PDF",
    "Failed to load MCP servers": "Не удалось загрузить MCP-серверы", "Failed to load DOCX library": "Не удалось загрузить библиотеку DOCX", "Failed to insert image": "Не удалось вставить изображение",
    "Failed to import document": "Не удалось импортировать документ", "Failed to generate AI reply": "Не удалось сгенерировать ответ ИИ", "Failed to fetch tag queue": "Не удалось получить очередь тегов",
    "Failed to extract memory suggestions": "Не удалось извлечь предложения памяти", "Failed to export document": "Не удалось экспортировать документ", "Failed to delete user": "Не удалось удалить пользователя",
    "Failed to delete photo": "Не удалось удалить фото", "Failed to delete memory": "Не удалось удалить память", "Failed to delete email": "Не удалось удалить письмо",
    "Failed to delete document": "Не удалось удалить документ", "Failed to create reply draft (": "Не удалось создать черновик ответа (", "Failed to clear reminder emails": "Не удалось очистить письма-напоминания",
    "Failed to change admin status": "Не удалось изменить статус администратора", "Failed to archive session": "Не удалось архивировать сессию", "Failed to add memory": "Не удалось добавить память",
    "Failed to add item": "Не удалось добавить элемент", "Failed": "Ошибка", "Fact-check": "Проверка фактов", "Eyedropper": "Пипетка", "Extra args": "Доп. аргументы",
    "Exporting PDF...": "Экспорт PDF...", "Exported as HTML": "Экспортировано как HTML", "Exported as DOCX": "Экспортировано как DOCX", "Export options": "Параметры экспорта",
    "Export filled PDF": "Экспортировать заполненный PDF", "Export calendar": "Экспортировать календарь", "Export as…": "Экспортировать как…", "Export .vcf": "Экспорт .vcf",
    "Export .csv": "Экспорт .csv", "Exact time...": "Точное время...", "Every N occurrences": "Каждые N повторений", "Eval prompts": "Промпты для оценки", "Env": "Окружение",
    "Enter password to disable": "Введите пароль для отключения", "Enter a style prompt": "Введите промпт стиля", "Enter a prompt for inpainting": "Введите промпт для inpaint",
    "Enter 6-digit code to verify": "Введите 6-значный код для подтверждения", "Engine": "Движок", "Endpoint status refreshed": "Статус эндпоинта обновлён", "Endpoint": "Эндпоинт",
    "End time must be after start time": "Время окончания должно быть позже начала", "Enable this check-in": "Включить эту проверку", "Empty...": "Пусто...",
    "Email triage rules": "Правила сортировки почты", "Email settings": "Настройки почты", "Editor container missing": "Контейнер редактора отсутствует", "Editor Shortcuts": "Горячие клавиши редактора",
    "Editor": "Редактор", "Edited": "Изменено", "Edit source (Ctrl+Alt+M to toggle)": "Изменить исходник (Ctrl+Alt+M)", "Edit serve command": "Изменить команду запуска",
    "Edit reminder": "Изменить напоминание", "Edit query": "Изменить запрос", "Edit photo": "Изменить фото", "Edit or preview": "Изменить или предпросмотр",
    "Edit manual hardware": "Изменить ручную конфигурацию железа", "Edit each color individually": "Изменить каждый цвет по отдельности", "Edit code": "Изменить код",
    "Edit and retry": "Изменить и повторить", "Edit (E)": "Изменить (E)", "Edge feather / stroke": "Растушёвка / обводка края", "Edge feather": "Растушёвка края",
    "Edge cleanup": "Очистка края", "Edge": "Край", "Duplicate shortcut": "Дублировать сочетание", "Drop image to add as new layer": "Перетащите изображение, чтобы добавить новый слой",
    "Draw your signature": "Нарисуйте подпись", "Draw a freehand selection. Esc to cancel.": "Нарисуйте произвольное выделение. Esc — отмена.", "Draw": "Рисовать",
    "Drafting AI reply": "Готовлю ответ ИИ", "Draft with AI": "Черновик с ИИ", "Draft saved to mailbox": "Черновик сохранён в почтовый ящик", "Draft not found": "Черновик не найден",
    "Draft a task with AI": "Составить задачу с ИИ", "Draft a reply with AI (Fast / Full + optional context)": "Составить ответ с ИИ (быстро / полно + контекст)",
    "Download the model first, then configure from Serve tab": "Сначала скачайте модель, затем настройте во вкладке «Запуск»", "Download destination": "Куда скачивать",
    "Download PNG to your computer": "Скачать PNG на компьютер", "Download PNG": "Скачать PNG", "Download PDF": "Скачать PDF", "Download + launch with smart defaults": "Скачать + запустить с разумными настройками",
    "Done": "Готово", "Does not repeat": "Не повторяется", "Document unlinked from session": "Документ отвязан от сессии", "Document saved": "Документ сохранён",
    "Document opened but panel could not mount": "Документ открыт, но панель не смонтировалась", "Document content...": "Содержимое документа...", "Document cloned to session": "Документ клонирован в сессию",
    "Document actions": "Действия с документом", "Docker: run this command in your terminal once.": "Docker: выполните эту команду в терминале один раз.", "Discard this new server": "Отменить новый сервер",
    "Disable 2FA": "Отключить 2FA", "Direct Download": "Прямая загрузка", "Dimensions": "Размеры", "Detected hardware": "Обнаруженное железо", "Description (or name) is required": "Нужно описание (или имя)",
    "Description (optional)": "Описание (необязательно)", "Description": "Описание", "Delete this webhook?": "Удалить этот вебхук?", "Delete this task and all its run history?": "Удалить эту задачу и всю историю запусков?",
    "Delete this signature?": "Удалить эту подпись?", "Delete this session permanently?": "Удалить эту сессию навсегда?", "Delete this server": "Удалить этот сервер",
    "Delete this research report?": "Удалить этот отчёт исследования?", "Delete this project?": "Удалить этот проект?", "Delete this photo? This cannot be undone.": "Удалить это фото? Это нельзя отменить.",
    "Delete this message?": "Удалить это сообщение?", "Delete this integration?": "Удалить эту интеграцию?", "Delete this image?": "Удалить это изображение?", "Delete this contact?": "Удалить этот контакт?",
    "Delete this chat permanently?": "Удалить этот чат навсегда?", "Delete this MCP server?": "Удалить этот MCP-сервер?", "Delete theme": "Удалить тему", "Delete reminders whose time has passed": "Удалить напоминания, время которых прошло",
    "Delete permanently": "Удалить навсегда", "Delete item": "Удалить элемент", "Delete from disk": "Удалить с диска", "Delete failed": "Не удалось удалить", "Delete calendar": "Удалить календарь",
    "Delete GGUF files": "Удалить файлы GGUF", "Default Chat Model": "Модель чата по умолчанию", "Default (no persona)": "По умолчанию (без персоны)", "Decrease width": "Уменьшить ширину",
    "Decrease height": "Уменьшить высоту", "Decrease": "Уменьшить", "Days": "Дни", "Date": "Дата", "Daily message limit": "Дневной лимит сообщений", "Daily check-ins": "Ежедневные проверки",
    "Customize": "Настроить", "Currently showing this album — click X to clear": "Показан этот альбом — нажмите X, чтобы сбросить", "Cron expression is required": "Нужно cron-выражение",
    "Cron": "Cron", "Create new blank document": "Создать новый пустой документ", "Create event in calendar": "Создать событие в календаре", "Create event": "Создать событие",
    "Could not start a new email (no session).": "Не удалось начать новое письмо (нет сессии).", "Could not run check-in": "Не удалось выполнить проверку", "Could not open serve panel": "Не удалось открыть панель запуска",
    "Could not open folder": "Не удалось открыть папку", "Could not open attachment": "Не удалось открыть вложение", "Could not open assistant": "Не удалось открыть ассистента",
    "Could not load assistant settings.": "Не удалось загрузить настройки ассистента.", "Could not load 2FA status": "Не удалось загрузить статус 2FA", "Could not find the user message to regenerate": "Не удалось найти сообщение пользователя для перегенерации",
    "Could not create document": "Не удалось создать документ", "Could not create album": "Не удалось создать альбом", "Could not create a session": "Не удалось создать сессию", "Could not browse folders": "Не удалось просмотреть папки",
    "Cost": "Стоимость", "Copy this log entry": "Копировать эту запись лога", "Copy the run output + verdict": "Копировать вывод запуска + вердикт", "Copy selection to new layer": "Копировать выделение в новый слой",
    "Copy selection to a new layer": "Копировать выделение в новый слой", "Copy report to clipboard": "Копировать отчёт в буфер обмена", "Copy launch command": "Копировать команду запуска",
    "Copy install command": "Копировать команду установки", "Copy failed (clipboard permission denied?)": "Не удалось скопировать (нет доступа к буферу?)", "Copy document": "Копировать документ",
    "Copy diagnostics": "Копировать диагностику", "Copy command to clipboard": "Копировать команду в буфер обмена", "Copy Chat": "Копировать чат", "Copied!": "Скопировано!",
    "Copied to new layer": "Скопировано в новый слой", "Copied to clipboard": "Скопировано в буфер обмена", "Copied last 50 lines": "Скопированы последние 50 строк", "Copied crash report": "Отчёт о сбое скопирован",
    "Convert selection to inpaint mask": "Преобразовать выделение в маску inpaint", "Context compacted — older messages summarized": "Контекст сжат — старые сообщения изложены кратко",
    "Context Window": "Окно контекста", "Contacts Import": "Импорт контактов", "Contacts (CardDAV)": "Контакты (CardDAV)", "Confirm": "Подтвердить", "Configure access": "Настроить доступ",
    "Configure & serve": "Настроить и запустить", "Completed deep research reports. Click to view.": "Завершённые отчёты глубокого исследования. Нажмите, чтобы открыть.", "Compare export": "Экспорт сравнения",
    "Compare changes": "Сравнить изменения", "Compare": "Сравнение", "Compact context": "Сжать контекст", "Command": "Команда", "Color match": "Подбор цвета", "Collapse section": "Свернуть раздел",
    "Collapse panel": "Свернуть панель", "Collapse": "Свернуть", "Coding": "Программирование", "Code runner not loaded": "Исполнитель кода не загружен", "Code or run": "Код или запуск",
    "Close this configuration panel": "Закрыть эту панель конфигурации", "Close sender panel": "Закрыть панель отправителя", "Close email": "Закрыть письмо", "Close all suggestions": "Закрыть все предложения",
    "Clone source set": "Источник клонирования задан", "Clipboard access denied or no image available": "Нет доступа к буферу или изображения нет", "Clipboard": "Буфер обмена",
    "Click to rebind": "Нажмите, чтобы переназначить", "Click to peek.": "Нажмите, чтобы подсмотреть.", "Click to manage tools": "Нажмите, чтобы управлять инструментами", "Click to manage privileges": "Нажмите, чтобы управлять правами",
    "Click to manage models": "Нажмите, чтобы управлять моделями", "Click to make a wand selection first": "Сначала сделайте выделение волшебной палочкой", "Click to edit": "Нажмите, чтобы изменить",
    "Click to copy": "Нажмите, чтобы скопировать", "Click the highlighted element to continue.": "Нажмите подсвеченный элемент, чтобы продолжить.", "Click the highlighted element to continue": "Нажмите подсвеченный элемент, чтобы продолжить",
    "Click it.": "Нажмите его.", "Click for details": "Нажмите для подробностей", "Click": "Нажмите", "Clear the selection": "Снять выделение", "Clear selection": "Снять выделение",
    "Clear past": "Очистить прошедшие", "Clear mask": "Очистить маску", "Clear manual hardware": "Очистить ручную конфигурацию железа", "Clear from list": "Убрать из списка",
    "Clear finished tasks": "Очистить завершённые задачи", "Clear finished": "Очистить завершённые", "Clear filter": "Сбросить фильтр", "Clear all selections": "Снять все выделения",
    "Clear all research": "Очистить все исследования", "Clear album filter": "Сбросить фильтр альбома", "Clear Server": "Очистить сервер", "Clear AI tags": "Очистить ИИ-теги",
    "Circle — click to cycle size": "Круг — нажмите для смены размера", "Choose an image file": "Выберите файл изображения", "Choose a signature": "Выберите подпись", "Checking models...": "Проверка моделей...",
    "Check-in running…": "Проверка выполняется…", "Check SSH connection": "Проверить SSH-соединение", "Check": "Проверить", "Chat created but no session id returned": "Чат создан, но id сессии не вернулся",
    "Chat copied to clipboard": "Чат скопирован в буфер обмена", "Change time": "Изменить время", "Change date": "Изменить дату", "Chain": "Цепочка", "Caption": "Подпись", "Canvas size": "Размер холста",
    "Cannot edit: message ID not found": "Нельзя изменить: ID сообщения не найден", "Cancelled.": "Отменено.", "Cancel research": "Отменить исследование", "Cancel event": "Отменить событие",
    "Camera": "Камера", "Calendar settings": "Настройки календаря", "Calendar refreshed": "Календарь обновлён", "Calendar Settings": "Настройки календаря", "Calendar": "Календарь",
    "Calculate and use suggested context from scanned hardware": "Рассчитать и использовать контекст по сканированному железу", "CPU / RAM only": "Только CPU / RAM",
    "Built-in capability updated": "Встроенная возможность обновлена", "Brush / Mask": "Кисть / Маска", "Browse photos": "Просмотр фото", "Brain": "Память", "Bold (Ctrl+B)": "Жирный (Ctrl+B)",
    "Blur": "Размытие", "Blind mode off": "Слепой режим выкл.", "Blind mode": "Слепой режим", "Blind": "Слепой", "Bearer (most common)": "Bearer (чаще всего)", "Bcc": "Скрытая копия",
    "Base URL": "Базовый URL", "Background Remove": "Удаление фона", "Back": "Назад", "Avg estimated cost per 1,000 responses": "Средняя оценка стоимости за 1000 ответов",
    "Auto-tag photos by content with your": "Авто-теги фото по содержимому через ваш", "Authorize with Google": "Авторизоваться через Google", "Authenticator app required on login": "Для входа нужно приложение-аутентификатор",
    "Audit Skills": "Проверить навыки", "Audit": "Аудит", "Assistant settings saved": "Настройки ассистента сохранены", "Assistant session unavailable": "Сессия ассистента недоступна", "Assistant": "Ассистент",
    "Ask an admin to configure model endpoints": "Попросите администратора настроить эндпоинты моделей", "Args": "Аргументы", "Archived sessions. Restore to make active again.": "Архивные сессии. Восстановите, чтобы снова сделать активными.",
    "Approximate context tokens used": "Примерно использовано токенов контекста", "Apply Style": "Применить стиль", "Appearance": "Внешний вид", "Amount": "Количество",
    "Also create a calendar event on the Cookbook calendar": "Также создать событие в календаре Cookbook", "Already tidy": "Уже прибрано", "Already saved": "Уже сохранено", "Already in contacts": "Уже в контактах",
    "Already clean": "Уже чисто", "Already added": "Уже добавлено", "Alpha": "Альфа", "Allowed models": "Разрешённые модели", "Allow CPU overflow (slow)": "Разрешить переполнение в CPU (медленно)",
    "All senders": "Все отправители", "All selected — Ctrl+C to copy, Del to delete": "Всё выбрано — Ctrl+C копировать, Del удалить", "All models verified": "Все модели проверены",
    "All active chat sessions. Click to open.": "Все активные сессии чата. Нажмите, чтобы открыть.", "Album renamed": "Альбом переименован", "Album options": "Параметры альбома", "Album deleted": "Альбом удалён",
    "Album cover updated": "Обложка альбома обновлена", "Album": "Альбом", "Agent prep": "Подготовка агента", "Agent mode": "Режим агента", "Agent": "Агент", "Advanced": "Дополнительно",
    "Admin access required": "Нужен доступ администратора", "Address (optional)": "Адрес (необязательно)", "Address": "Адрес", "Adding": "Добавление", "Added": "Добавлено",
    "Add to selection (Shift)": "Добавить к выделению (Shift)", "Add to model picker": "Добавить в список моделей", "Add text — click to cycle size": "Добавить текст — нажмите для смены размера",
    "Add text box (then click on PDF)": "Добавить текстовое поле (затем нажмите на PDF)", "Add signature (then click on PDF)": "Добавить подпись (затем нажмите на PDF)", "Add server": "Добавить сервер",
    "Add selection to the inpaint mask": "Добавить выделение в маску inpaint", "Add model directory": "Добавить каталог моделей", "Add empty layer": "Добавить пустой слой",
    "Add checkmark (then click on PDF)": "Добавить галочку (затем нажмите на PDF)", "Add a to-do…": "Добавить задачу…", "Add a tag": "Добавить тег", "Add Task": "Добавить задачу",
    "Add Models": "Добавить модели", "Add MCP Server": "Добавить MCP-сервер", "Activity": "Активность", "Active downloads, installs and model launches.": "Активные загрузки, установки и запуски моделей.",
    "Active - click to pause": "Активно — нажмите, чтобы приостановить", "Access denied": "Доступ запрещён", "Accept All": "Принять всё", "Accept": "Принять", "API Integration": "API-интеграция",
    "AI-tag all untagged photos (in the current album, if any)": "ИИ-теги для всех непомеченных фото (в текущем альбоме, если есть)", "AI-broken-down goal": "Цель, разбитая ИИ",
    "AI tidy: delete junk sessions and organize into folders": "ИИ-уборка: удалить мусорные сессии и разложить по папкам", "AI reply ready, but draft was edited": "Ответ ИИ готов, но черновик был изменён",
    "AI found nothing to fill": "ИИ не нашёл, чем заполнить", "AI flagged as spam — click ✓ to unflag": "ИИ пометил как спам — нажмите ✓, чтобы снять", "AI Tags": "ИИ-теги", "AI Tagging": "ИИ-тегирование",
    "AI Defaults": "Параметры ИИ", "+ Add item": "+ Добавить элемент"
  });

  // Strings the app compares against via textContent/innerText — never translate.
  var READBACK_GUARD = { "AI": 1, "Saved": 1, "unreachable": 1, "Conversation compacted": 1 };

  // ---- Engine ---------------------------------------------------------------
  function readLang() {
    try { var l = localStorage.getItem(STORAGE_KEY); if (l && SUPPORTED.indexOf(l) !== -1) return l; } catch (e) {}
    return DEFAULT_LANG;
  }

  var I18N = { lang: readLang(), supported: SUPPORTED.slice(), DEFAULT_LANG: DEFAULT_LANG, strings: STRINGS, phrases: PHRASES };

  function lookup(key) {
    var entry = STRINGS[key];
    if (entry == null) return null;
    if (typeof entry === 'string') return entry;
    if (entry[I18N.lang] != null) return entry[I18N.lang];
    if (entry.en != null) return entry.en;
    return null;
  }
  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, k) { return (vars[k] != null) ? String(vars[k]) : m; });
  }
  function t(key, vars) { var s = lookup(key); if (s == null) return key; return interpolate(s, vars); }

  // Layer 1: explicit data-i18n* attributes.
  function applyOne(el) {
    var k, s;
    if ((k = el.getAttribute('data-i18n')) != null)            { s = lookup(k); if (s != null) el.textContent = s; }
    if ((k = el.getAttribute('data-i18n-html')) != null)       { s = lookup(k); if (s != null) el.innerHTML = s; }
    if ((k = el.getAttribute('data-i18n-placeholder')) != null){ s = lookup(k); if (s != null) el.setAttribute('placeholder', s); }
    if ((k = el.getAttribute('data-i18n-title')) != null)      { s = lookup(k); if (s != null) el.setAttribute('title', s); }
    if ((k = el.getAttribute('data-i18n-aria')) != null)       { s = lookup(k); if (s != null) el.setAttribute('aria-label', s); }
  }
  var SELECTOR = '[data-i18n],[data-i18n-html],[data-i18n-placeholder],[data-i18n-title],[data-i18n-aria]';
  function applyI18n(root) {
    root = root || document;
    try {
      if (root.nodeType === 1 && root.matches && root.matches(SELECTOR)) applyOne(root);
      var nodes = root.querySelectorAll(SELECTOR);
      for (var i = 0; i < nodes.length; i++) applyOne(nodes[i]);
    } catch (e) {}
  }

  // Layer 2: phrase-based auto-translate (RU only). ---------------------------
  // Subtrees we never translate: user/AI content, code, the editor, raw inputs.
  var SKIP_SEL = '#chat-history, pre, code, kbd, samp, textarea, [contenteditable],' +
                 ' .doc-editor-textarea, .doc-editor-highlight, script, style, [data-no-i18n]';
  var ATTRS = ['title', 'placeholder', 'aria-label'];
  var observer = null;

  function blocked(node) {
    var el = node && (node.nodeType === 3 ? node.parentElement : node);
    return !el || !el.closest || !!el.closest(SKIP_SEL);
  }
  function translateTextNode(node) {
    var raw = node.nodeValue;
    if (!raw) return;
    var m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var core = m && m[2];
    if (!core || READBACK_GUARD[core]) return;
    var ru = PHRASES[core];
    if (ru != null && ru !== core) node.nodeValue = m[1] + ru + m[3];
  }
  function translateAttrs(el) {
    if (!el || el.nodeType !== 1 || !el.getAttribute) return;
    if (el.closest && el.closest(SKIP_SEL)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]); if (!v) continue;
      var core = v.trim(); if (READBACK_GUARD[core]) continue;
      var ru = PHRASES[core];
      if (ru != null && ru !== core) el.setAttribute(ATTRS[i], ru);
    }
  }
  function translateTree(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.closest && root.closest(SKIP_SEL)) return;
    try {
      var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          return (n.parentElement && n.parentElement.closest(SKIP_SEL))
            ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });
      var n; while ((n = tw.nextNode())) translateTextNode(n);
      if (root.matches && root.matches('[title],[placeholder],[aria-label]')) translateAttrs(root);
      var withAttrs = root.querySelectorAll('[title],[placeholder],[aria-label]');
      for (var i = 0; i < withAttrs.length; i++) translateAttrs(withAttrs[i]);
    } catch (e) {}
  }
  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === 'characterData') {
          if (!blocked(mu.target)) translateTextNode(mu.target);
        } else if (mu.type === 'attributes') {
          translateAttrs(mu.target);
        } else {
          for (var j = 0; j < mu.addedNodes.length; j++) {
            var an = mu.addedNodes[j];
            if (an.nodeType === 3) { if (!blocked(an)) translateTextNode(an); }
            else if (an.nodeType === 1) translateTree(an);
          }
        }
      }
    });
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  // ---- Public API + boot ----------------------------------------------------
  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1 || lang === I18N.lang) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    I18N.lang = lang;
    try { document.documentElement.lang = lang; } catch (e) {}
    try { location.reload(); } catch (e) {}
  }

  window.I18N = I18N;
  window.t = t;
  window.applyI18n = applyI18n;
  window.translateTree = translateTree;
  window.setLang = setLang;

  try { document.documentElement.lang = I18N.lang; } catch (e) {}

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el && el.id === 'ui-language-select') setLang(el.value);
  });

  function onReady() {
    applyI18n(document);
    var sel = document.getElementById('ui-language-select');
    if (sel) sel.value = I18N.lang;
    if (I18N.lang === 'ru') {        // English is the source language -> no-op.
      translateTree(document.body);
      startObserver();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
