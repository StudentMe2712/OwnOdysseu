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
