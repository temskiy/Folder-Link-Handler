const { Plugin, MarkdownView, PluginSettingTab, Setting, EditorSuggest, TFolder, FuzzySuggestModal, Platform } = require("obsidian");

// Dynamically load Electron shell (desktop only)
let shell = null;
if (Platform.isDesktop) {
    try {
        shell = require("electron").shell;
    } catch (e) {
        console.warn("FolderLinkHandler: Electron shell not available");
    }
}

// Cross-platform path separator without Node.js dependency
const PATH_SEP = Platform.isDesktop ? (Platform.isWin ? "\\" : "/") : "/";

const DEFAULT_SETTINGS = {
    language: "auto",
    debugMode: false,
    highlightDuration: 2000,
    highlightColor: "var(--interactive-accent)",
    readModeBehavior: "tree",
    editModeBehavior: "tree",
    protocolPrefix: "folder",
    suggestEnabled: true,
    suggestPathFormat: "vault-root",
    useAngleBrackets: true,
    folderLinkColor: "",
    fileLinkColor: "",
    brokenLinkColor: "",
    ctrlInvertsBehavior: true,
    pathModifications: "",
    pathModificationsTarget: "relative",
    markBrokenLinks: true,
    linkFormat: "markdown"
};

// ============================================================
// LOCALIZATION STRINGS
// ============================================================
const STRINGS = {
    en: {
        // Settings page sections
        settingsTitle: "Folder Link Handler — Settings",
        sectionMain: "Main",
        sectionBehavior: "Link behavior",
        sectionInsert: "Link insertion",
        sectionSuggest: "Autocompletion",
        sectionColors: "Colors & indicators",
        sectionAppearance: "Appearance",
        sectionPathMod: "Path modification for external programs",
        sectionLang: "Language",
        sectionData: "Import / Export",
        sectionHelp: "Help",
        sectionMobile: "⚠️ Mobile version",
        
        // Main settings
        prefixName: "Protocol prefix",
        prefixDesc: "Default is \"folder\". Links will look like [Text](prefix:path). Changing the prefix will not update existing links in notes.",
        debugName: "Debug mode",
        debugDesc: "Output diagnostic messages to console (Ctrl+Shift+I)",
        
        // Behavior settings
        readModeName: "In reading mode",
        editModeName: "In editing mode",
        behaviorTree: "📂 Reveal & highlight in file tree",
        behaviorExplorer: "🗂️ Open in system explorer",
        ctrlInvertName: "Ctrl+click inverts behavior",
        ctrlInvertDesc: "When enabled, holding Ctrl (or Cmd on macOS) while clicking a link performs the alternative action.",
        
        // Insert settings
        linkFormatName: "Link format for insertion",
        linkFormatDesc: "Format used by \"Insert folder link\" and \"Copy as folder link\" commands. Autocompletion works only for Markdown format.",
        formatMarkdown: "📝 Markdown",
        formatWiki: "🔗 Wiki",
        angleBracketsName: "Angle brackets (Markdown only)",
        angleBracketsDesc: "Wrap path in angle brackets <...> when inserting. Required for correct handling of paths with spaces.",
        pathFormatName: "Path format for insertion",
        pathFormatDesc: "Path format used by autocompletion, \"Insert folder link\" and \"Copy as folder link\" commands.",
        pathVaultRoot: "/ From vault root",
        pathRelative: "📁 Relative to current file",
        
        // Suggest settings
        suggestName: "Enable autocompletion",
        suggestDesc: "Show folder list when typing [text](prefix: in editing mode. Markdown format only.",
        
        // Color settings
        markBrokenName: "Mark broken links",
        markBrokenDesc: "If the folder or file referenced by the link does not exist, the link will be marked as broken.",
        brokenColorName: "Broken links color",
        folderColorName: "Folder links color",
        fileColorName: "File links color",
        colorDefault: "Default",
        
        // Appearance settings
        highlightDurationName: "Highlight duration (ms)",
        highlightDurationDesc: "How long the folder will be highlighted after navigation",
        highlightColorName: "Folder highlight color",
        highlightColorDesc: "Background color of the folder in file tree after navigation",
        
        // Path modification settings
        pathModTargetName: "Which path to apply rules to",
        pathModTargetDesc: "\"Relative path\" — rules are applied to the path relative to the vault root. If the result looks like an absolute path, it is used as-is. \"Full filesystem path\" — rules are applied to the full filesystem path.",
        pathModRelative: "📁 Relative path (inside vault)",
        pathModAbsolute: "💾 Full filesystem path",
        pathModRulesName: "Path modification rules",
        pathModRulesDesc: "Regular expressions for modifying the path before passing it to an external program. Each rule on a separate line. Lines starting with # are comments.",
        pathModPlaceholder: "# ⚠️ Slashes are automatically normalized for your OS\n#\n# Format: pattern => replacement [|| flags]\n# Flags: i (case-insensitive), l (literal mode), s (first match only)\n#\n# Examples (for \"Relative path\" mode):\n# MyVault => D:\\MyVault || l\n# ^OldFolder => NewFolder",
        pathModHelpTitle: "📖 Rules syntax help",
        pathModHelpFormat: "Format: pattern => replacement or pattern => replacement || flags",
        pathModHelpFlags: "Flags (specified after || at the end of the line):",
        pathModHelpFlagI: "i — case-insensitive matching",
        pathModHelpFlagL: "l — literal mode: all special regex characters in the pattern are treated as literal characters, slashes are normalized for the OS",
        pathModHelpFlagS: "s — replace only the first match (instead of all matches)",
        pathModHelpExamples: "Examples:",
        pathModHelpEx1: "MyVault => D:\\Archive || l — redirect \"MyVault\" folder to D:\\Archive",
        pathModHelpEx2: "^OldName => NewName — rename folder in the path",
        pathModHelpEx3: "/ => \\\\ || l — replace forward slashes with backslashes (add as last rule if needed)",
        pathModHelpWhere: "Where applied: file-ext: (always), folder prefix (only when behavior is \"Open in system explorer\"). Folder tree navigation is NOT affected.",
        pathModHelpOrder: "Rules are applied sequentially from top to bottom. Each subsequent rule sees the result of the previous one.",
        
        // Language settings
        languageName: "Interface language",
        languageDesc: "Choose the plugin interface language. \"Auto\" uses system language.",
        langAuto: "🌐 Auto (system language)",
        langRu: "🇷🇺 Русский",
        langEn: "🇬🇧 English",
        
        // Import/Export
        exportName: "Export settings",
        exportDesc: "Save plugin settings to a JSON file",
        exportButton: "Export",
        importName: "Import settings",
        importDesc: "Load plugin settings from a JSON file",
        importButton: "Import",
        exportSuccess: "✅ Settings exported",
        importSuccess: "✅ Settings imported successfully",
        importError: "❌ Failed to import settings",
        
        // Notices
        folderNotFound: "❌ Folder not found",
        fileNotFound: "❌ File not found",
        openError: "❌ Error opening",
        openedInExplorer: "🗂️ Opened in explorer",
        fileOpened: "📄 File opened",
        linkCopied: "📋 Link copied",
        linkInserted: "📂 Link inserted",
        desktopOnly: "⚠️ This feature is available on desktop only",
        pathError: "❌ Failed to resolve path",
        ruleError: "❌ Error in modification rule",
        fileExplorerNotFound: "File Explorer not found",
        folderNotFoundInTree: "Folder not found in tree",
        error: "Error",
        restartRequired: "Restart required",
        
        // Autocompletion
        suggestPlaceholder: "Select a folder to insert link...",
        
        // Mobile info
        mobileInfo: "You are using the mobile version of Obsidian. Some features are unavailable:",
        mobileFeature1: "Opening in system explorer",
        mobileFeature2: "Opening files with external programs",
        mobileFeature3: "Ctrl+click to invert behavior",
        mobileInfoEnd: "Other features (folder navigation, autocompletion, link insertion, colors) work fully.",
        
        // Help
        helpTitle: "📖 Help",
        helpFormatsTitle: "Folder link formats",
        helpAbsPath: "Absolute path from vault root",
        helpRelPath: "Relative to current file",
        helpParentPath: "One level up",
        helpFileLinksTitle: "File links (open in external program)",
        helpAbsFile: "Absolute path",
        helpRelFile: "Relative to current file",
        helpAngleBracketsTitle: "⚠️ Angle brackets",
        helpAngleBracketsText: "For Markdown format, the entire link content (prefix and path) is wrapped in <code>&lt;...&gt;</code>. This is required for paths with spaces. For Wiki format, angle brackets are not needed.",
        helpSpecialCharsTitle: "🔧 Special characters in paths",
        helpSpecialCharsText: "Paths can contain parentheses, dots, and other special characters. If the path contains parentheses, they are treated as part of the path, not as link delimiters.",
        helpMultipleLinksTitle: "🔗 Multiple links in one line",
        helpMultipleLinksText: "If multiple links are in the same line, clicking on a specific link will open that link (the nearest one to the click position).",
        helpModifiersTitle: "🎯 Modifier keys",
        helpModifiersText1: "Regular click — performs the action from settings",
        helpModifiersText2: "Ctrl+click (Windows/Linux) or Cmd+click (macOS) — performs the alternative action",
        helpSuggestTitle: "✨ Autocompletion",
        helpSuggestText: "Start typing [text](prefix: — a folder list will appear. The selected path is automatically wrapped in &lt;...&gt; (if enabled). Cursor moves after the closing bracket.",
        helpCommandsTitle: "⌨️ Commands",
        helpInsertCommand: "\"Insert folder link\" — open command palette (Ctrl+P) and search for this command. A folder selection dialog will appear.",
        helpCopyCommand: "\"Copy as folder link\" — right-click on a folder in the file tree and select this option.",
        helpBrokenTitle: "🔴 Broken link indicators",
        helpBrokenText: "If the folder or file referenced by the link does not exist, the link will be marked with a dashed underline. Hovering shows a tooltip with the reason.",
        helpColorsTitle: "🎨 Link colors",
        helpColorsText: "You can set different colors for folder links and file links. Colors are applied in reading mode. Leave empty for default color.",
        helpPathModTitle: "🔧 Path modification for external programs",
        helpPathModText: "Rules from the \"Path modification\" section are applied only when passing the path to an external program. The folder tree navigation is not affected. Slashes are automatically normalized for your OS.",
        helpWikiTitle: "🔗 Wiki syntax",
        helpWikiText: "Both Markdown and Wiki formats are supported for clicks. Autocompletion works only for Markdown format. For inserting Wiki links, use the \"Insert folder link\" command with Wiki format selected in settings.",
        helpMobileNote: "Note: Some features are available on desktop only."
    },
    ru: {
        // Settings page sections
        settingsTitle: "Folder Link Handler — Настройки",
        sectionMain: "Основные",
        sectionBehavior: "Поведение ссылок",
        sectionInsert: "Вставка ссылок",
        sectionSuggest: "Автодополнение",
        sectionColors: "Цвета и индикация",
        sectionAppearance: "Внешний вид",
        sectionPathMod: "Модификация путей для внешних программ",
        sectionLang: "Язык интерфейса",
        sectionData: "Импорт / Экспорт",
        sectionHelp: "Справка",
        sectionMobile: "⚠️ Мобильная версия",
        
        // Main settings
        prefixName: "Префикс протокола",
        prefixDesc: "По умолчанию «folder». Ссылки будут выглядеть как [Текст](префикс:путь). Изменение префикса не обновит существующие ссылки в заметках.",
        debugName: "Режим отладки",
        debugDesc: "Выводить диагностические сообщения в консоль (Ctrl+Shift+I)",
        
        // Behavior settings
        readModeName: "В режиме чтения",
        editModeName: "В режиме редактирования",
        behaviorTree: "📂 Раскрыть и выделить в дереве файлов",
        behaviorExplorer: "🗂️ Открыть в системном проводнике",
        ctrlInvertName: "Ctrl+клик инвертирует поведение",
        ctrlInvertDesc: "Если включено, удержание Ctrl (или Cmd на macOS) при клике на ссылку выполнит альтернативное действие.",
        
        // Insert settings
        linkFormatName: "Формат ссылки при вставке",
        linkFormatDesc: "Формат для команд «Вставить ссылку на папку» и «Копировать как folder-ссылку». Автодополнение работает только для Markdown-формата.",
        formatMarkdown: "📝 Markdown",
        formatWiki: "🔗 Wiki",
        angleBracketsName: "Угловые скобки (только Markdown)",
        angleBracketsDesc: "Оборачивать путь в угловые скобки <...> при вставке. Необходимо для корректной работы ссылок с пробелами в путях.",
        pathFormatName: "Формат пути при вставке",
        pathFormatDesc: "Формат пути для автодополнения, команд «Вставить ссылку на папку» и «Копировать как folder-ссылку».",
        pathVaultRoot: "/ От корня хранилища",
        pathRelative: "📁 Относительно текущего файла",
        
        // Suggest settings
        suggestName: "Включить автодополнение",
        suggestDesc: "Показывать список папок при вводе [текст](префикс: в режиме редактирования. Только для Markdown-формата.",
        
        // Color settings
        markBrokenName: "Помечать битые ссылки",
        markBrokenDesc: "Если папка или файл по ссылке не существует, ссылка будет помечена как битая.",
        brokenColorName: "Цвет битых ссылок",
        folderColorName: "Цвет ссылок на папки",
        fileColorName: "Цвет ссылок на файлы",
        colorDefault: "По умолчанию",
        
        // Appearance settings
        highlightDurationName: "Длительность подсветки (мс)",
        highlightDurationDesc: "Как долго папка будет подсвечена после перехода",
        highlightColorName: "Цвет подсветки папки",
        highlightColorDesc: "Цвет фона папки в дереве файлов после перехода",
        
        // Path modification settings
        pathModTargetName: "К какому пути применять правила",
        pathModTargetDesc: "«Относительный путь» — правила применяются к пути относительно корня хранилища. Если результат похож на абсолютный путь, он используется как есть. «Полный путь ФС» — правила применяются к полному пути файловой системы.",
        pathModRelative: "📁 Относительный путь (внутри хранилища)",
        pathModAbsolute: "💾 Полный путь файловой системы",
        pathModRulesName: "Правила модификации пути",
        pathModRulesDesc: "Регулярные выражения для модификации пути перед передачей внешней программе. Каждое правило на отдельной строке. Строки, начинающиеся с # — комментарии.",
        pathModPlaceholder: "# ⚠️ Слеши автоматически нормализуются под вашу ОС\n#\n# Формат: паттерн => замена [|| флаги]\n# Флаги: i (без учёта регистра), l (литеральный режим), s (только первое совпадение)\n#\n# Примеры (для режима «Относительный путь»):\n# Хранилище 42 => D:\\Архив || l\n# ^СтараяПапка => НоваяПапка",
        pathModHelpTitle: "📖 Справка по синтаксису правил",
        pathModHelpFormat: "Формат: паттерн => замена или паттерн => замена || флаги",
        pathModHelpFlags: "Флаги (указываются после || в конце строки):",
        pathModHelpFlagI: "i — без учёта регистра",
        pathModHelpFlagL: "l — литеральный режим: все спецсимволы регулярных выражений в паттерне трактуются как обычные символы, слеши нормализуются под ОС",
        pathModHelpFlagS: "s — заменить только первое совпадение (вместо всех совпадений)",
        pathModHelpExamples: "Примеры:",
        pathModHelpEx1: "Хранилище 42 => D:\\Архив || l — перенаправить папку «Хранилище 42» на D:\\Архив",
        pathModHelpEx2: "^СтароеИмя => НовоеИмя — переименовать папку в пути",
        pathModHelpEx3: "/ => \\\\ || l — заменить прямые слеши на обратные (добавьте последним правилом, если нужно)",
        pathModHelpWhere: "Где применяется: file-ext: (всегда), префикс папок (только при поведении «Открыть в системном проводнике»). Переход к папке в дереве файлов НЕ затрагивается.",
        pathModHelpOrder: "Правила выполняются последовательно сверху вниз. Каждое следующее правило видит результат предыдущего.",
        
        // Language settings
        languageName: "Язык интерфейса",
        languageDesc: "Выберите язык интерфейса плагина. «Авто» использует язык системы.",
        langAuto: "🌐 Авто (язык системы)",
        langRu: "🇷🇺 Русский",
        langEn: "🇬🇧 English",
        
        // Import/Export
        exportName: "Экспорт настроек",
        exportDesc: "Сохранить настройки плагина в JSON-файл",
        exportButton: "Экспортировать",
        importName: "Импорт настроек",
        importDesc: "Загрузить настройки плагина из JSON-файла",
        importButton: "Импортировать",
        exportSuccess: "✅ Настройки экспортированы",
        importSuccess: "✅ Настройки импортированы",
        importError: "❌ Ошибка импорта настроек",
        
        // Notices
        folderNotFound: "❌ Папка не найдена",
        fileNotFound: "❌ Файл не найден",
        openError: "❌ Ошибка открытия",
        openedInExplorer: "🗂️ Открыто в проводнике",
        fileOpened: "📄 Открыт файл",
        linkCopied: "📋 Ссылка скопирована",
        linkInserted: "📂 Ссылка вставлена",
        desktopOnly: "⚠️ Эта функция доступна только на десктопе",
        pathError: "❌ Не удалось определить путь",
        ruleError: "❌ Ошибка в правиле модификации",
        fileExplorerNotFound: "File Explorer не найден",
        folderNotFoundInTree: "Папка не найдена в дереве",
        error: "Ошибка",
        restartRequired: "Требуется перезапуск",
        
        // Autocompletion
        suggestPlaceholder: "Выберите папку для вставки ссылки...",
        
        // Mobile info
        mobileInfo: "Вы используете мобильную версию Obsidian. Некоторые функции недоступны:",
        mobileFeature1: "Открытие в системном проводнике",
        mobileFeature2: "Открытие файлов внешними программами",
        mobileFeature3: "Ctrl+клик для инверсии поведения",
        mobileInfoEnd: "Остальные функции (переход к папке в дереве, автодополнение, вставка ссылок, цвета) работают полностью.",
        
        // Help
        helpTitle: "📖 Справка",
        helpFormatsTitle: "Форматы ссылок на папки",
        helpAbsPath: "Абсолютный путь от корня хранилища",
        helpRelPath: "Относительно текущего файла",
        helpParentPath: "На уровень выше",
        helpFileLinksTitle: "Ссылки на файлы (открытие во внешней программе)",
        helpAbsFile: "Абсолютный путь",
        helpRelFile: "Относительно текущего файла",
        helpAngleBracketsTitle: "⚠️ Угловые скобки",
        helpAngleBracketsText: "Для формата Markdown весь контент ссылки (префикс и путь) оборачивается в <code>&lt;...&gt;</code>. Это обязательно для путей с пробелами. Для формата Wiki угловые скобки не нужны.",
        helpSpecialCharsTitle: "🔧 Специальные символы в путях",
        helpSpecialCharsText: "Пути могут содержать скобки, точки и другие специальные символы. Если путь содержит скобки, они обрабатываются как часть пути, а не как разделители ссылки.",
        helpMultipleLinksTitle: "🔗 Несколько ссылок в одной строке",
        helpMultipleLinksText: "Если в одной строке несколько ссылок, клик по конкретной ссылке откроет именно её (ближайшую к позиции клика).",
        helpModifiersTitle: "🎯 Модификаторы клавиш",
        helpModifiersText1: "Обычный клик — выполняет действие из настроек",
        helpModifiersText2: "Ctrl+клик (Windows/Linux) или Cmd+клик (macOS) — выполняет альтернативное действие",
        helpSuggestTitle: "✨ Автодополнение",
        helpSuggestText: "Начните вводить [текст](префикс: — появится список папок. Выбранный путь автоматически оборачивается в &lt;...&gt; (если включено). Курсор перемещается за закрывающую скобку.",
        helpCommandsTitle: "⌨️ Команды",
        helpInsertCommand: "«Вставить ссылку на папку» — откройте палитру команд (Ctrl+P) и найдите эту команду. Откроется диалог выбора папки.",
        helpCopyCommand: "«Копировать как folder-ссылку» — кликните правой кнопкой мыши на папке в дереве файлов и выберите этот пункт.",
        helpBrokenTitle: "🔴 Индикация битых ссылок",
        helpBrokenText: "Если папка или файл по ссылке не существует, ссылка будет помечена пунктирным подчёркиванием. При наведении курсора появится подсказка с причиной.",
        helpColorsTitle: "🎨 Цвета ссылок",
        helpColorsText: "Можно задать разные цвета для ссылок на папки и на файлы. Цвета применяются в режиме чтения. Оставьте пустым для стандартного цвета.",
        helpPathModTitle: "🔧 Модификация путей для внешних программ",
        helpPathModText: "Правила из раздела «Модификация путей» применяются только при передаче пути внешней программе. Переход к папке в дереве файлов не затрагивается. Слеши автоматически нормализуются под вашу ОС.",
        helpWikiTitle: "🔗 Вики-синтаксис",
        helpWikiText: "Оба формата (Markdown и Wiki) поддерживаются для кликов. Автодополнение работает только для Markdown-формата. Для вставки вики-ссылок используйте команду «Вставить ссылку на папку» с выбранным форматом Wiki в настройках.",
        helpMobileNote: "Примечание: Некоторые функции доступны только на десктопе."
    }
};

module.exports = class FolderLinkHandlerPlugin extends Plugin {
    async onload() {
        await this.loadSettings();
        
        this.log("Plugin loading...");
        this.log("Platform: Desktop =", Platform.isDesktop, ", Mobile =", Platform.isMobile);
        this.log("Shell available:", !!shell);
        
        this.isProcessing = false;
        
        this.clickHandler = (evt) => {
            if (this.isProcessing) {
                this.log("clickHandler already processing, skipping");
                return;
            }
            
            let element = evt.target;
            let targetHref = null;
            let isEditMode = false;
            let linkType = null;
            
            const prefix = this.getProtocolPrefix();
            const filePrefix = "file-ext:";
            
            while (element && element !== document.body) {
                const href = element.getAttribute("href");
                const dataHref = element.getAttribute("data-href");
                
                if (href) {
                    if (href.startsWith(prefix)) {
                        targetHref = href.substring(prefix.length);
                        linkType = "folder";
                        this.log("Found via href:", targetHref);
                        break;
                    }
                    if (href.startsWith(filePrefix)) {
                        targetHref = href.substring(filePrefix.length);
                        linkType = "file";
                        this.log("Found via href:", targetHref);
                        break;
                    }
                }
                
                if (dataHref) {
                    if (dataHref.startsWith(prefix)) {
                        targetHref = dataHref.substring(prefix.length);
                        linkType = "folder";
                        this.log("Found via data-href:", targetHref);
                        break;
                    }
                    if (dataHref.startsWith(filePrefix)) {
                        targetHref = dataHref.substring(filePrefix.length);
                        linkType = "file";
                        this.log("Found via data-href:", targetHref);
                        break;
                    }
                }
                
                if (element.tagName === "SPAN") {
                    const classes = element.className || "";
                    if (classes.includes("cm-")) {
                        const found = this.findProtocolUrlAtCoords(evt);
                        if (found) {
                            targetHref = found.path;
                            linkType = found.type;
                            isEditMode = true;
                            this.log("Extracted via coords:", targetHref);
                            break;
                        }
                        
                        const foundSiblings = this.findProtocolUrlInSiblings(element);
                        if (foundSiblings) {
                            targetHref = foundSiblings.path;
                            linkType = foundSiblings.type;
                            isEditMode = true;
                            this.log("Extracted via siblings:", targetHref);
                            break;
                        }
                    }
                }
                
                element = element.parentElement;
            }
            
            if (!targetHref) return;
            
            this.log("✓ Found link, type:", linkType, "rawPath:", targetHref);
            
            this.isProcessing = true;
            
            evt.preventDefault();
            evt.stopPropagation();
            evt.stopImmediatePropagation();
            
            const isModifierPressed = Platform.isDesktop ? (evt.ctrlKey || evt.metaKey) : false;
            
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            const currentMode = view ? view.getMode() : "preview";
            
            let baseBehavior;
            if (currentMode === "preview") {
                baseBehavior = this.settings.readModeBehavior;
            } else {
                baseBehavior = this.settings.editModeBehavior;
            }
            
            let finalBehavior = baseBehavior;
            if (isModifierPressed && this.settings.ctrlInvertsBehavior) {
                finalBehavior = (baseBehavior === "tree") ? "explorer" : "tree";
            }
            
            this.dispatchAction(linkType, targetHref, finalBehavior);
            
            setTimeout(() => {
                this.isProcessing = false;
            }, 500);
            
            return false;
        };
        
        window.addEventListener("click", this.clickHandler, true);
        
        // Register hover handler (desktop only)
        if (Platform.isDesktop) {
            this.hoverHandler = (evt) => {
                let element = evt.target;
                
                while (element && element !== document.body) {
                    if (element.tagName === "A") {
                        const href = element.getAttribute("href");
                        const dataHref = element.getAttribute("data-href");
                        
                        const prefix = this.getProtocolPrefix();
                        const filePrefix = "file-ext:";
                        
                        if ((href && (href.startsWith(prefix) || href.startsWith(filePrefix))) ||
                            (dataHref && (dataHref.startsWith(prefix) || dataHref.startsWith(filePrefix)))) {
                            
                            evt.preventDefault();
                            evt.stopPropagation();
                            evt.stopImmediatePropagation();
                            
                            const targetHref = href || dataHref;
                            const linkType = targetHref.startsWith(prefix) ? "folder" : "file";
                            const rawPath = linkType === "folder" 
                                ? targetHref.substring(prefix.length) 
                                : targetHref.substring(filePrefix.length);
                            
                            let displayPath = rawPath.replace(/^<+|>+$/g, "").trim();
                            try {
                                displayPath = decodeURIComponent(displayPath);
                            } catch (e) {
                                displayPath = displayPath.replace(/%20/g, " ");
                            }
                            
                            element.setAttribute("title", `${linkType === "folder" ? "📂" : "📄"} ${displayPath}`);
                            
                            this.log("Hover blocked for:", targetHref);
                            
                            return false;
                        }
                    }
                    
                    element = element.parentElement;
                }
            };
            
            window.addEventListener("mouseover", this.hoverHandler, true);
        }
        
        if (this.settings.suggestEnabled) {
            this.registerEditorSuggest(new FolderSuggest(this.app, this));
        }
        
        this.addCommand({
            id: "insert-folder-link",
            name: "Insert folder link / Вставить ссылку на папку",
            editorCallback: (editor, view) => {
                new FolderInsertModal(this.app, this, editor).open();
            }
        });
        
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file, source) => {
                if (file instanceof TFolder) {
                    menu.addItem((item) => {
                        item.setTitle(this.t("linkCopied").replace("📋 ", "") + " (folder-link)")
                            .setIcon("link")
                            .onClick(() => {
                                this.copyFolderLink(file);
                            });
                    });
                }
            })
        );
        
        this.registerMarkdownPostProcessor((element, context) => {
            this.processLinks(element, context);
        });
        
        this.addSettingTab(this.settingTab = new FolderLinkHandlerSettingTab(this.app, this));
    }
    
    // ============================================================
    // LOCALIZATION
    // ============================================================
    
    getLanguage() {
        if (this.settings.language === "auto") {
            const systemLang = navigator.language || "en";
            return systemLang.startsWith("ru") ? "ru" : "en";
        }
        return this.settings.language;
    }
    
    t(key) {
        const lang = this.getLanguage();
        return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    }
    
    // ============================================================
    // CORE METHODS
    // ============================================================
    
    getProtocolPrefix() {
        return (this.settings.protocolPrefix || "folder") + ":";
    }
    
    findPathEndIndex(text, pathStart) {
        if (text[pathStart] === "<") {
            const endIndex = text.indexOf(">", pathStart + 1);
            if (endIndex !== -1) return endIndex;
        }
        
        let depth = 0;
        for (let i = pathStart; i < text.length; i++) {
            const char = text[i];
            
            if (char === "(") {
                depth++;
            } else if (char === ")") {
                if (depth === 0) return i;
                else depth--;
            } else if (char === "]" || char === "|" || char === "<" || char === ">") {
                return i;
            }
        }
        
        return text.length;
    }
    
    findPathInText(text, prefix, cursorPos = -1) {
        let prefixIndex = -1;
        
        if (cursorPos >= 0) {
            let searchIndex = 0;
            let bestIndex = -1;
            let bestDistance = Infinity;
            
            while (true) {
                const idx = text.indexOf(prefix, searchIndex);
                if (idx === -1) break;
                
                const pathStart = idx + prefix.length;
                const pathEnd = this.findPathEndIndex(text, pathStart);
                
                let linkStart = idx;
                for (let i = idx - 1; i >= 0; i--) {
                    if (text[i] === "[") {
                        linkStart = i;
                        break;
                    }
                    if (idx - i > 200) break;
                }
                
                if (cursorPos >= linkStart && cursorPos <= pathEnd) {
                    prefixIndex = idx;
                    break;
                }
                
                const distance = Math.abs(cursorPos - pathStart);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = idx;
                }
                
                searchIndex = idx + 1;
            }
            
            if (prefixIndex === -1) {
                prefixIndex = bestIndex;
            }
        } else {
            prefixIndex = text.indexOf(prefix);
        }
        
        if (prefixIndex === -1) return null;
        
        const pathStart = prefixIndex + prefix.length;
        
        if (text[pathStart] === "<") {
            const endIndex = text.indexOf(">", pathStart + 1);
            if (endIndex !== -1) {
                return text.substring(pathStart + 1, endIndex);
            }
        }
        
        const pathEnd = this.findPathEndIndex(text, pathStart);
        const path = text.substring(pathStart, pathEnd);
        
        return path.length > 0 ? path : null;
    }
    
    resolvePathForCheck(inputPath, sourcePath) {
        const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!sourceFile) return null;
        
        let result = inputPath.replace(/^<+|>+$/g, "").trim();
        try { result = decodeURIComponent(result); } catch (e) { result = result.replace(/%20/g, " "); }
        
        const cleanPath = result.replace(/\/+$/, "");
        
        if (cleanPath.startsWith("/")) return cleanPath.substring(1);
        
        const basePath = sourceFile.parent ? sourceFile.parent.path : "";
        const baseParts = basePath ? basePath.split("/") : [];
        for (const part of cleanPath.split("/")) {
            if (part === "..") baseParts.pop();
            else if (part !== "." && part !== "") baseParts.push(part);
        }
        return baseParts.join("/");
    }
    
    processLinks(element, context) {
        const prefix = this.getProtocolPrefix();
        const filePrefix = "file-ext:";
        const folderColor = this.settings.folderLinkColor;
        const fileColor = this.settings.fileLinkColor;
        const brokenColor = this.settings.brokenLinkColor;
        const checkBroken = this.settings.markBrokenLinks;
        
        if (!checkBroken && !folderColor && !fileColor) return;
        
        const links = element.querySelectorAll("a");
        
        for (const link of links) {
            const href = link.getAttribute("href");
            const dataHref = link.getAttribute("data-href");
            
            let linkType = null, rawPath = null;
            
            if (href) {
                if (href.startsWith(prefix)) { linkType = "folder"; rawPath = href.substring(prefix.length); }
                else if (href.startsWith(filePrefix)) { linkType = "file"; rawPath = href.substring(filePrefix.length); }
            }
            if (!linkType && dataHref) {
                if (dataHref.startsWith(prefix)) { linkType = "folder"; rawPath = dataHref.substring(prefix.length); }
                else if (dataHref.startsWith(filePrefix)) { linkType = "file"; rawPath = dataHref.substring(filePrefix.length); }
            }
            
            if (!linkType) continue;
            
            let isBroken = false, brokenReason = null, resolvedPath = null;
            
            if (checkBroken) {
                resolvedPath = this.resolvePathForCheck(rawPath, context.sourcePath);
                if (resolvedPath) {
                    const target = this.app.vault.getAbstractFileByPath(resolvedPath);
                    const isValid = target && ((linkType === "folder" && target.children) || (linkType === "file" && !target.children));
                    if (!isValid) {
                        isBroken = true;
                        brokenReason = !target ? "Path not found" : (linkType === "folder" ? "Path points to a file" : "Path points to a folder");
                    }
                }
            }
            
            if (isBroken) {
                link.classList.add("is-unresolved");
                link.classList.add("folder-link-broken");
                link.setAttribute("title", `⚠️ ${brokenReason}: ${resolvedPath}`);
                if (brokenColor) link.style.color = brokenColor;
                else link.style.removeProperty("color");
            } else {
                if (linkType === "folder" && folderColor) link.style.color = folderColor;
                else if (linkType === "file" && fileColor) link.style.color = fileColor;
            }
        }
    }
    
    normalizeSlashes(p) { return p.replace(/[/\\]/g, PATH_SEP); }
    
    isAbsolutePath(p) {
        return /^[A-Za-z]:[/\\]/.test(p) || p.startsWith("\\\\") || p.startsWith("/");
    }
    
    parseModificationRule(rule) {
        let ruleText = rule.trim(), literal = false, flags = "g";
        
        const flagsIndex = ruleText.lastIndexOf("||");
        if (flagsIndex !== -1) {
            const flagsPart = ruleText.substring(flagsIndex + 2).trim();
            ruleText = ruleText.substring(0, flagsIndex).trim();
            if (flagsPart.includes("i")) flags += "i";
            if (flagsPart.includes("l")) literal = true;
            if (flagsPart.includes("s")) flags = flags.replace("g", "");
        }
        
        const separatorIndex = ruleText.indexOf("=>");
        if (separatorIndex === -1) return null;
        
        let pattern = ruleText.substring(0, separatorIndex).trim();
        const replacement = ruleText.substring(separatorIndex + 2).trim();
        if (pattern.length === 0) return null;
        
        if (literal) {
            pattern = this.normalizeSlashes(pattern);
            pattern = this.escapeRegex(pattern);
        }
        
        return { literal, flags, pattern, replacement };
    }
    
    buildExternalPath(relativePath, vaultBasePath) {
        const target = this.settings.pathModificationsTarget;
        const rulesText = this.settings.pathModifications;
        
        if (!rulesText || !rulesText.trim()) return this.normalizeSlashes(vaultBasePath + PATH_SEP + relativePath);
        
        const rules = rulesText.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
        if (!rules.length) return this.normalizeSlashes(vaultBasePath + PATH_SEP + relativePath);
        
        let result = target === "relative" ? this.normalizeSlashes(relativePath) : this.normalizeSlashes(vaultBasePath + PATH_SEP + relativePath);
        
        for (const rule of rules) {
            const parsed = this.parseModificationRule(rule);
            if (!parsed) continue;
            try {
                const regex = new RegExp(parsed.pattern, parsed.flags);
                const newResult = result.replace(regex, parsed.replacement);
                if (newResult !== result) result = newResult;
            } catch (e) {
                new Notice(this.t("ruleError") + ": " + e.message);
            }
        }
        
        if (target === "relative" && this.isAbsolutePath(result)) return result;
        if (target === "relative") return this.normalizeSlashes(vaultBasePath) + PATH_SEP + result;
        return result;
    }
    
    getRelativePath(fromPath, toPath) {
        const fromParts = fromPath ? fromPath.split("/") : [];
        const toParts = toPath ? toPath.split("/") : [];
        let common = 0;
        while (common < fromParts.length && common < toParts.length && fromParts[common] === toParts[common]) common++;
        
        const parts = [];
        for (let i = 0; i < fromParts.length - common; i++) parts.push("..");
        for (let i = common; i < toParts.length; i++) parts.push(toParts[i]);
        
        if (!parts.length) return ".";
        if (parts[0] !== "..") parts.unshift(".");
        return parts.join("/");
    }
    
    buildLinkText(folderName, folderPath) {
        const prefix = this.getProtocolPrefix();
        const format = this.settings.suggestPathFormat;
        const useBrackets = this.settings.useAngleBrackets;
        const linkFormat = this.settings.linkFormat;
        
        const currentFile = this.app.workspace.getActiveFile();
        const currentFolderPath = currentFile && currentFile.parent ? currentFile.parent.path : "";
        
        const insertPath = format === "vault-root" ? "/" + folderPath : this.getRelativePath(currentFolderPath, folderPath);
        
        if (linkFormat === "wiki") return "[[" + prefix + insertPath + "|" + folderName + "]]";
        return useBrackets ? "[" + folderName + "](<" + prefix + insertPath + ">)" : "[" + folderName + "](" + prefix + insertPath + ")";
    }
    
    copyFolderLink(folder) {
        const linkText = this.buildLinkText(folder.name, folder.path);
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(linkText).then(() => {
                new Notice(this.t("linkCopied") + ": " + folder.name);
            }).catch(err => {
                this.log("Clipboard error:", err.message);
                new Notice(this.t("linkCopied") + ": " + linkText);
            });
        } else {
            new Notice(this.t("linkCopied") + ": " + linkText);
        }
    }
    
    dispatchAction(linkType, relativePath, behavior) {
        if (linkType === "file") this.openFileExternally(relativePath);
        else if (behavior === "explorer") this.openInExplorer(relativePath);
        else this.handleFolderLink(relativePath);
    }
    
    findProtocolUrlAtCoords(evt) {
        try {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view || !view.editor) return null;
            
            const editor = view.editor;
            let lineText = null;
            let chInLine = -1;
            
            const clientX = evt.clientX || (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
            const clientY = evt.clientY || (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);
            
            if (editor.cm && typeof editor.cm.posAtCoords === "function") {
                const pos = editor.cm.posAtCoords({x: clientX, y: clientY});
                if (pos != null) {
                    const line = editor.cm.state.doc.lineAt(pos);
                    lineText = line.text;
                    chInLine = pos - line.from;
                }
            }
            if (!lineText && typeof editor.posAtCoords === "function") {
                const pos = editor.posAtCoords({left: clientX, top: clientY});
                if (pos) {
                    lineText = editor.getLine(pos.line);
                    chInLine = pos.ch;
                }
            }
            if (!lineText) {
                lineText = editor.getLine(editor.getCursor().line);
                chInLine = editor.getCursor().ch;
            }
            if (!lineText) return null;
            
            this.log("Line at coords:", lineText, "chInLine:", chInLine);
            
            const folderPrefix = this.getProtocolPrefix();
            const filePrefix = "file-ext:";
            
            let path = this.findPathInText(lineText, folderPrefix, chInLine);
            if (path) return { path: path.trim(), type: "folder" };
            
            path = this.findPathInText(lineText, filePrefix, chInLine);
            if (path) return { path: path.trim(), type: "file" };
            
            return null;
        } catch (e) { return null; }
    }
    
    findProtocolUrlInSiblings(startElement) {
        const folderPrefix = this.getProtocolPrefix();
        const filePrefix = "file-ext:";
        
        const selfText = startElement.textContent || "";
        
        let path = this.findPathInText(selfText, folderPrefix);
        if (path) return { path: path.trim(), type: "folder" };
        path = this.findPathInText(selfText, filePrefix);
        if (path) return { path: path.trim(), type: "file" };
        
        let parent = startElement.parentElement;
        while (parent && parent.tagName !== "DIV" && parent !== document.body) {
            const spans = parent.querySelectorAll("span");
            
            let concatenatedText = "";
            for (const span of spans) {
                concatenatedText += span.textContent || "";
            }
            
            this.log("Concatenated spans text:", concatenatedText);
            
            path = this.findPathInText(concatenatedText, folderPrefix);
            if (path) return { path: path.trim(), type: "folder" };
            path = this.findPathInText(concatenatedText, filePrefix);
            if (path) return { path: path.trim(), type: "file" };
            
            parent = parent.parentElement;
        }
        return null;
    }
    
    escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
    
    log(...args) {
        if (this.settings && this.settings.debugMode) console.log("[FolderLinkHandler]", ...args);
    }
    
    async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
    async saveSettings() { await this.saveData(this.settings); }
    
    decodePath(inputPath) {
        let result = inputPath.replace(/^<+|>+$/g, "").trim();
        try { result = decodeURIComponent(result); } catch (e) { result = result.replace(/%20/g, " "); }
        return result;
    }
    
    resolveInputPath(inputPath) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) return null;
        
        const sourceFile = this.app.vault.getAbstractFileByPath(view.file.path);
        if (!sourceFile) return null;
        
        const cleanPath = this.decodePath(inputPath).replace(/\/+$/, "");
        
        if (cleanPath.startsWith("/")) return { resolvedPath: cleanPath.substring(1), basePath: "" };
        
        const basePath = sourceFile.parent ? sourceFile.parent.path : "";
        const baseParts = basePath ? basePath.split("/") : [];
        for (const part of cleanPath.split("/")) {
            if (part === "..") baseParts.pop();
            else if (part !== "." && part !== "") baseParts.push(part);
        }
        return { resolvedPath: baseParts.join("/"), basePath };
    }
    
    openInExplorer(inputPath) {
        const resolved = this.resolveInputPath(inputPath);
        if (!resolved) { new Notice(this.t("pathError")); return; }
        
        const target = this.app.vault.getAbstractFileByPath(resolved.resolvedPath);
        if (!target || !target.children) { new Notice(this.t("folderNotFound") + ": " + resolved.resolvedPath); return; }
        
        if (!Platform.isDesktop || !shell) {
            new Notice(this.t("desktopOnly"));
            return;
        }
        
        const absolutePath = this.buildExternalPath(resolved.resolvedPath, this.app.vault.adapter.basePath);
        
        shell.openPath(absolutePath).then(error => {
            if (error) new Notice(this.t("openError") + ": " + error);
            else new Notice(this.t("openedInExplorer") + ": " + target.name);
        });
    }
    
    openFileExternally(inputPath) {
        const resolved = this.resolveInputPath(inputPath);
        if (!resolved) { new Notice(this.t("pathError")); return; }
        
        const target = this.app.vault.getAbstractFileByPath(resolved.resolvedPath);
        if (!target || target.children) { new Notice(this.t("fileNotFound") + ": " + resolved.resolvedPath); return; }
        
        if (!Platform.isDesktop || !shell) {
            new Notice(this.t("desktopOnly"));
            return;
        }
        
        const absolutePath = this.buildExternalPath(resolved.resolvedPath, this.app.vault.adapter.basePath);
        
        shell.openPath(absolutePath).then(error => {
            if (error) new Notice(this.t("openError") + ": " + error);
            else new Notice(this.t("fileOpened") + ": " + target.name);
        });
    }
    
    handleFolderLink(inputPath) {
        const resolved = this.resolveInputPath(inputPath);
        if (!resolved) { new Notice(this.t("pathError")); return; }
        
        const target = this.app.vault.getAbstractFileByPath(resolved.resolvedPath);
        
        if (target && target.children) {
            this.revealAndExpandFolder(target);
        } else {
            new Notice(this.t("folderNotFound") + ": " + resolved.resolvedPath);
        }
    }
    
    wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    
    getFileItemFromExplorer(fileExplorer, path) {
        try {
            if (typeof fileExplorer.getFileItem === "function") {
                const item = fileExplorer.getFileItem(path);
                if (item) return item;
            }
            if (fileExplorer.fileItems && fileExplorer.fileItems[path]) {
                return fileExplorer.fileItems[path];
            }
            if (fileExplorer.fileItems) {
                for (const key in fileExplorer.fileItems) {
                    const item = fileExplorer.fileItems[key];
                    if (item.file && item.file.path === path) return item;
                    if (item.path === path) return item;
                }
            }
            return null;
        } catch (e) { return null; }
    }
    
    tryExpandFileItem(fileItem) {
        if (!fileItem) return false;
        try {
            if (typeof fileItem.setExpanded === "function") { fileItem.setExpanded(true); return true; }
            if (typeof fileItem.expand === "function") { fileItem.expand(); return true; }
            if (fileItem.collapsed !== undefined) { fileItem.collapsed = false; return true; }
            return false;
        } catch (e) { return false; }
    }
    
    findTreeItemByPath(path) {
        const treeItems = document.querySelectorAll(".tree-item");
        
        for (const item of treeItems) {
            const selfEl = item.querySelector(".tree-item-self");
            if (selfEl && selfEl.getAttribute("data-path") === path) return item;
        }
        
        const folderName = path.split("/").pop();
        for (const item of treeItems) {
            const selfEl = item.querySelector(".tree-item-self");
            if (selfEl) {
                const nameEl = selfEl.querySelector(".tree-item-inner") || selfEl;
                if (nameEl.textContent.trim() === folderName) return item;
            }
        }
        
        return null;
    }
    
    expandIfCollapsed(treeItem) {
        if (!treeItem) return false;
        if (!treeItem.classList.contains("is-collapsed")) return false;
        
        const collapseIcon = treeItem.querySelector(".tree-item-icon.collapse-icon");
        if (collapseIcon) {
            collapseIcon.click();
            return true;
        }
        return false;
    }
    
    async revealAndExpandFolder(folder) {
        try {
            const fileExplorer = this.app.internalPlugins.plugins["file-explorer"].instance;
            if (!fileExplorer) {
                new Notice(this.t("fileExplorerNotFound"));
                return;
            }
            
            this.log("Revealing folder:", folder.path);
            
            if (typeof fileExplorer.revealInFolder === "function") {
                try {
                    fileExplorer.revealInFolder(folder);
                    
                    let targetItem = null;
                    let attempts = 0;
                    while (!targetItem && attempts < 30) {
                        await this.wait(20);
                        targetItem = this.findTreeItemByPath(folder.path);
                        attempts++;
                    }
                    
                    if (targetItem) {
                        this.highlightTreeItem(targetItem, folder.name);
                        return;
                    }
                } catch (e) {
                    this.log("revealInFolder error:", e.message);
                }
            }
            
            const pathSegments = folder.path.split("/").filter(s => s !== "");
            let currentPath = "";
            
            for (let i = 0; i < pathSegments.length; i++) {
                currentPath = i === 0 ? pathSegments[0] : currentPath + "/" + pathSegments[i];
                
                const fileItem = this.getFileItemFromExplorer(fileExplorer, currentPath);
                
                if (fileItem && i < pathSegments.length - 1) {
                    const expanded = this.tryExpandFileItem(fileItem);
                    if (expanded) await this.wait(100);
                }
            }
            
            let targetItem = this.findTreeItemByPath(folder.path);
            
            if (!targetItem) {
                let attempts = 0;
                while (!targetItem && attempts < 15) {
                    await this.wait(100);
                    targetItem = this.findTreeItemByPath(folder.path);
                    attempts++;
                }
            }
            
            if (!targetItem) {
                const fileItem = this.getFileItemFromExplorer(fileExplorer, folder.path);
                if (fileItem && fileItem.el) {
                    targetItem = fileItem.el.closest(".tree-item") || fileItem.el;
                }
            }
            
            if (!targetItem) {
                new Notice(this.t("folderNotFoundInTree") + ": " + folder.name);
                return;
            }
            
            if (this.expandIfCollapsed(targetItem)) {
                await this.wait(100);
            }
            
            this.highlightTreeItem(targetItem, folder.name);
            
        } catch (e) {
            new Notice(this.t("error") + ": " + e.message);
            console.error("[FolderLinkHandler]", e);
        }
    }
    
    highlightTreeItem(targetItem, folderName) {
        document.querySelectorAll(".tree-item-self.is-selected").forEach(el => {
            el.classList.remove("is-selected");
        });
        
        const selfEl = targetItem.querySelector(".tree-item-self") || targetItem;
        
        selfEl.classList.add("is-selected");
        selfEl.scrollIntoView({ block: "center", behavior: "smooth" });
        
        const highlightColor = this.settings.highlightColor;
        const highlightDuration = this.settings.highlightDuration;
        
        requestAnimationFrame(() => {
            selfEl.style.setProperty("background-color", highlightColor, "important");
            selfEl.style.setProperty("transition", "background-color 0.3s", "important");
            
            setTimeout(() => {
                selfEl.style.removeProperty("background-color");
                selfEl.style.removeProperty("transition");
            }, highlightDuration);
        });
        
        new Notice("📂 " + folderName);
    }
    
    onunload() {
        if (this.clickHandler) window.removeEventListener("click", this.clickHandler, true);
        if (this.hoverHandler) window.removeEventListener("mouseover", this.hoverHandler, true);
        const style = document.getElementById("folder-link-handler-settings-style");
        if (style) style.remove();
    }
};

class FolderSuggest extends EditorSuggest {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
    
    onTrigger(cursor, editor, file) {
        if (!this.plugin.settings.suggestEnabled) return null;
        
        const prefix = this.plugin.getProtocolPrefix();
        const line = editor.getLine(cursor.line);
        const lineBeforeCursor = line.substring(0, cursor.ch);
        
        const markdownPattern = new RegExp("\\]\\((\\<?" + this.plugin.escapeRegex(prefix) + "[^\\)]*)$");
        const match = lineBeforeCursor.match(markdownPattern);
        
        if (!match) return null;
        
        const fullMatch = match[1];
        const startCh = cursor.ch - fullMatch.length - 1;
        
        let query = fullMatch.replace(/^</, "");
        query = query.substring(prefix.length);
        
        let end = cursor;
        if (line[cursor.ch] === ")") {
            end = { line: cursor.line, ch: cursor.ch + 1 };
        }
        
        return {
            start: { line: cursor.line, ch: startCh },
            end: end,
            query: query
        };
    }
    
    getSuggestions(context) {
        const formatSetting = this.plugin.settings.suggestPathFormat;
        const currentFile = this.app.workspace.getActiveFile();
        const currentFolderPath = currentFile && currentFile.parent ? currentFile.parent.path : "";
        
        const folders = this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder);
        const suggestions = [];
        const query = context.query.toLowerCase();
        
        for (const folder of folders) {
            let displayPath = formatSetting === "vault-root" 
                ? "/" + folder.path 
                : this.plugin.getRelativePath(currentFolderPath, folder.path);
            
            if (query === "" || displayPath.toLowerCase().includes(query)) {
                suggestions.push({ folder, displayPath });
            }
            if (suggestions.length >= 50) break;
        }
        
        return suggestions;
    }
    
    renderSuggestion(value, el) {
        const container = el.createDiv({ cls: "folder-suggest-item" });
        container.createEl("div", { text: value.folder.name, cls: "folder-suggest-name" });
        container.createEl("small", { text: value.displayPath, cls: "folder-suggest-path" });
    }
    
    selectSuggestion(value, evt) {
        const prefix = this.plugin.getProtocolPrefix();
        const formatSetting = this.plugin.settings.suggestPathFormat;
        const useBrackets = this.plugin.settings.useAngleBrackets;
        const currentFile = this.app.workspace.getActiveFile();
        const currentFolderPath = currentFile && currentFile.parent ? currentFile.parent.path : "";
        
        const insertPath = formatSetting === "vault-root" 
            ? "/" + value.folder.path 
            : this.plugin.getRelativePath(currentFolderPath, value.folder.path);
        
        const insertText = useBrackets 
            ? "(<" + prefix + insertPath + ">)" 
            : "(" + prefix + insertPath + ")";
        
        const editor = this.context.editor;
        editor.replaceRange(insertText, this.context.start, this.context.end);
        
        const newCursorCh = this.context.start.ch + insertText.length;
        editor.setCursor({ line: this.context.start.line, ch: newCursorCh });
        
        return true;
    }
}

class FolderInsertModal extends FuzzySuggestModal {
    constructor(app, plugin, editor) {
        super(app);
        this.plugin = plugin;
        this.editor = editor;
        this.setPlaceholder(this.plugin.t("suggestPlaceholder"));
    }
    
    getItems() { return this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder); }
    getItemText(item) { return item.path; }
    
    onChooseItem(item, evt) {
        const linkText = this.plugin.buildLinkText(item.name, item.path);
        const cursor = this.editor.getCursor();
        this.editor.replaceRange(linkText, cursor);
        this.editor.setCursor({ line: cursor.line, ch: cursor.ch + linkText.length });
        new Notice(this.plugin.t("linkInserted") + ": " + item.name);
    }
}

class FolderLinkHandlerSettingTab extends PluginSettingTab {
    constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
    
    display() {
        const { containerEl } = this;
        containerEl.empty();
        this.injectSettingsStyles();
        
        const t = (key) => this.plugin.t(key);
        
        containerEl.createEl("h2", { text: t("settingsTitle") });
        
        // ============================================================
        // LANGUAGE SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionLang") });
        
        new Setting(containerEl)
            .setName(t("languageName"))
            .setDesc(t("languageDesc"))
            .addDropdown(d => d
                .addOption("auto", t("langAuto"))
                .addOption("ru", t("langRu"))
                .addOption("en", t("langEn"))
                .setValue(this.plugin.settings.language)
                .onChange(async v => {
                    this.plugin.settings.language = v;
                    await this.plugin.saveSettings();
                    this.display();
                }));
        
        // ============================================================
        // MAIN SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionMain") });
        
        new Setting(containerEl).setName(t("prefixName")).setDesc(t("prefixDesc"))
            .addText(text => text.setPlaceholder("folder").setValue(this.plugin.settings.protocolPrefix)
                .onChange(async (value) => {
                    const clean = value.trim().replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "");
                    if (clean.length > 0) {
                        this.plugin.settings.protocolPrefix = clean;
                        await this.plugin.saveSettings();
                    }
                }));
        
        new Setting(containerEl).setName(t("debugName"))
            .addToggle(tgl => tgl.setValue(this.plugin.settings.debugMode).onChange(async v => {
                this.plugin.settings.debugMode = v; await this.plugin.saveSettings();
            }));
        
        // ============================================================
        // BEHAVIOR SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionBehavior") });
        
        new Setting(containerEl).setName(t("readModeName"))
            .addDropdown(d => d.addOption("tree", t("behaviorTree")).addOption("explorer", t("behaviorExplorer"))
                .setValue(this.plugin.settings.readModeBehavior).onChange(async v => {
                    this.plugin.settings.readModeBehavior = v; await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl).setName(t("editModeName"))
            .addDropdown(d => d.addOption("tree", t("behaviorTree")).addOption("explorer", t("behaviorExplorer"))
                .setValue(this.plugin.settings.editModeBehavior).onChange(async v => {
                    this.plugin.settings.editModeBehavior = v; await this.plugin.saveSettings();
                }));
        
        if (Platform.isDesktop) {
            new Setting(containerEl).setName(t("ctrlInvertName")).setDesc(t("ctrlInvertDesc"))
                .addToggle(tgl => tgl.setValue(this.plugin.settings.ctrlInvertsBehavior).onChange(async v => {
                    this.plugin.settings.ctrlInvertsBehavior = v; await this.plugin.saveSettings();
                }));
        }
        
        // ============================================================
        // INSERT SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionInsert") });
        
        new Setting(containerEl).setName(t("linkFormatName")).setDesc(t("linkFormatDesc"))
            .addDropdown(d => d.addOption("markdown", t("formatMarkdown")).addOption("wiki", t("formatWiki"))
                .setValue(this.plugin.settings.linkFormat).onChange(async v => {
                    this.plugin.settings.linkFormat = v; await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl).setName(t("angleBracketsName")).setDesc(t("angleBracketsDesc"))
            .addToggle(tgl => tgl.setValue(this.plugin.settings.useAngleBrackets).onChange(async v => {
                this.plugin.settings.useAngleBrackets = v; await this.plugin.saveSettings();
            }));
        
        new Setting(containerEl).setName(t("pathFormatName")).setDesc(t("pathFormatDesc"))
            .addDropdown(d => d.addOption("vault-root", t("pathVaultRoot")).addOption("relative", t("pathRelative"))
                .setValue(this.plugin.settings.suggestPathFormat).onChange(async v => {
                    this.plugin.settings.suggestPathFormat = v; await this.plugin.saveSettings();
                }));
        
        // ============================================================
        // SUGGEST SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionSuggest") });
        
        new Setting(containerEl).setName(t("suggestName")).setDesc(t("suggestDesc"))
            .addToggle(tgl => tgl.setValue(this.plugin.settings.suggestEnabled).onChange(async v => {
                this.plugin.settings.suggestEnabled = v; await this.plugin.saveSettings();
                new Notice(t("restartRequired"));
            }));
        
        // ============================================================
        // COLORS SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionColors") });
        
        new Setting(containerEl).setName(t("markBrokenName")).setDesc(t("markBrokenDesc"))
            .addToggle(tgl => tgl.setValue(this.plugin.settings.markBrokenLinks).onChange(async v => {
                this.plugin.settings.markBrokenLinks = v; await this.plugin.saveSettings();
            }));
        
        this.createColorSetting(containerEl, t("brokenColorName"), "brokenLinkColor");
        this.createColorSetting(containerEl, t("folderColorName"), "folderLinkColor");
        this.createColorSetting(containerEl, t("fileColorName"), "fileLinkColor");
        
        // ============================================================
        // APPEARANCE SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionAppearance") });
        
        new Setting(containerEl).setName(t("highlightDurationName")).setDesc(t("highlightDurationDesc"))
            .addText(txt => txt.setPlaceholder("2000").setValue(String(this.plugin.settings.highlightDuration))
                .onChange(async v => {
                    const n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 0) {
                        this.plugin.settings.highlightDuration = n;
                        await this.plugin.saveSettings();
                    }
                }));
        
        this.createColorSetting(containerEl, t("highlightColorName"), "highlightColor");
        
        // ============================================================
        // PATH MODIFICATION SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionPathMod") });
        
        new Setting(containerEl)
            .setName(t("pathModTargetName"))
            .setDesc(t("pathModTargetDesc"))
            .addDropdown(d => d
                .addOption("relative", t("pathModRelative"))
                .addOption("absolute", t("pathModAbsolute"))
                .setValue(this.plugin.settings.pathModificationsTarget)
                .onChange(async v => {
                    this.plugin.settings.pathModificationsTarget = v;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName(t("pathModRulesName"))
            .setDesc(t("pathModRulesDesc"))
            .addTextArea(textArea => {
                textArea
                    .setPlaceholder(t("pathModPlaceholder"))
                    .setValue(this.plugin.settings.pathModifications)
                    .onChange(async (value) => {
                        this.plugin.settings.pathModifications = value;
                        await this.plugin.saveSettings();
                    });
                
                textArea.inputEl.classList.add("folder-link-rules-textarea");
            });
        
        // Apply styling class to the textarea container
        const rulesSetting = containerEl.querySelector(".setting-item:last-of-type");
        if (rulesSetting) {
            rulesSetting.classList.add("folder-link-rules-setting");
        }
        
        // Help block for rules syntax
        const rulesHelpEl = containerEl.createDiv();
        rulesHelpEl.style.fontSize = "12px";
        rulesHelpEl.style.color = "var(--text-muted)";
        rulesHelpEl.style.marginTop = "12px";
        rulesHelpEl.style.padding = "12px";
        rulesHelpEl.style.background = "var(--background-secondary)";
        rulesHelpEl.style.borderRadius = "6px";
        rulesHelpEl.style.lineHeight = "1.6";
        
        rulesHelpEl.innerHTML = `
            <p style="margin-top: 0;"><strong>${t("pathModHelpTitle")}</strong></p>
            <p><strong>${t("pathModHelpFormat")}</strong></p>
            <p><strong>${t("pathModHelpFlags")}</strong></p>
            <ul>
                <li><code>i</code> — ${t("pathModHelpFlagI")}</li>
                <li><code>l</code> — ${t("pathModHelpFlagL")}</li>
                <li><code>s</code> — ${t("pathModHelpFlagS")}</li>
            </ul>
            <p><strong>${t("pathModHelpExamples")}</strong></p>
            <ul>
                <li><code>Хранилище 42 => D:\\Архив || l</code> — ${t("pathModHelpEx1").split("—")[1]?.trim() || ""}</li>
                <li><code>^СтароеИмя => НовоеИмя</code> — ${t("pathModHelpEx2").split("—")[1]?.trim() || ""}</li>
                <li><code>/ => \\\\ || l</code> — ${t("pathModHelpEx3").split("—")[1]?.trim() || ""}</li>
            </ul>
            <p><strong>${t("pathModHelpWhere")}</strong></p>
            <p><strong>${t("pathModHelpOrder")}</strong></p>
        `;
        
        // ============================================================
        // IMPORT / EXPORT SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionData") });
        
        new Setting(containerEl)
            .setName(t("exportName"))
            .setDesc(t("exportDesc"))
            .addButton(button => button
                .setButtonText(t("exportButton"))
                .onClick(() => this.exportSettings()));
        
        new Setting(containerEl)
            .setName(t("importName"))
            .setDesc(t("importDesc"))
            .addButton(button => button
                .setButtonText(t("importButton"))
                .onClick(() => this.importSettings()));
        
        // ============================================================
        // MOBILE INFO SECTION
        // ============================================================
        if (!Platform.isDesktop) {
            containerEl.createEl("h3", { text: t("sectionMobile") });
            const mobileInfo = containerEl.createDiv();
            mobileInfo.innerHTML = `
                <p style="font-size: 12px; color: var(--text-muted);">${t("mobileInfo")}</p>
                <ul style="font-size: 12px; color: var(--text-muted);">
                    <li>${t("mobileFeature1")}</li>
                    <li>${t("mobileFeature2")}</li>
                    <li>${t("mobileFeature3")}</li>
                </ul>
                <p style="font-size: 12px; color: var(--text-muted);">${t("mobileInfoEnd")}</p>
            `;
        }
        
        // ============================================================
        // HELP SECTION
        // ============================================================
        containerEl.createEl("h3", { text: t("sectionHelp") });
        
        const prefix = this.plugin.settings.protocolPrefix || "folder";
        const helpEl = containerEl.createDiv();
        helpEl.style.fontSize = "13px";
        helpEl.style.color = "var(--text-muted)";
        helpEl.style.lineHeight = "1.6";
        
        helpEl.innerHTML = `
            <p><strong>${t("helpFormatsTitle")}:</strong></p>
            <ul>
                <li><code>[Text](&lt;${prefix}:/path/from/root&gt;)</code> — ${t("helpAbsPath")}</li>
                <li><code>[Text](&lt;${prefix}:./folder&gt;)</code> — ${t("helpRelPath")}</li>
                <li><code>[Text](&lt;${prefix}:../folder&gt;)</code> — ${t("helpParentPath")}</li>
            </ul>
            
            <p><strong>${t("helpFileLinksTitle")}:</strong></p>
            <ul>
                <li><code>[Text](&lt;file-ext:/path/to/file.pdf&gt;)</code> — ${t("helpAbsFile")}</li>
                <li><code>[Text](&lt;file-ext:./document.pdf&gt;)</code> — ${t("helpRelFile")}</li>
            </ul>
            
            <p><strong>${t("helpAngleBracketsTitle")}:</strong></p>
            <p>${t("helpAngleBracketsText")}</p>
            
            <p><strong>${t("helpSpecialCharsTitle")}:</strong></p>
            <p>${t("helpSpecialCharsText")}</p>
            
            <p><strong>${t("helpMultipleLinksTitle")}:</strong></p>
            <p>${t("helpMultipleLinksText")}</p>
            
            ${Platform.isDesktop ? `
            <p><strong>${t("helpModifiersTitle")}:</strong></p>
            <ul>
                <li>${t("helpModifiersText1")}</li>
                <li>${t("helpModifiersText2")}</li>
            </ul>
            ` : ""}
            
            <p><strong>${t("helpSuggestTitle")}:</strong></p>
            <p>${t("helpSuggestText")}</p>
            
            <p><strong>${t("helpCommandsTitle")}:</strong></p>
            <ul>
                <li>${t("helpInsertCommand")}</li>
                <li>${t("helpCopyCommand")}</li>
            </ul>
            
            <p><strong>${t("helpBrokenTitle")}:</strong></p>
            <p>${t("helpBrokenText")}</p>
            
            <p><strong>${t("helpColorsTitle")}:</strong></p>
            <p>${t("helpColorsText")}</p>
            
            <p><strong>${t("helpPathModTitle")}:</strong></p>
            <p>${t("helpPathModText")}</p>
            
            <p><strong>${t("helpWikiTitle")}:</strong></p>
            <p>${t("helpWikiText")}</p>
            
            ${!Platform.isDesktop ? `<p style="margin-top: 12px; font-style: italic;">${t("helpMobileNote")}</p>` : ""}
        `;
    }
    
    createColorSetting(containerEl, name, key) {
        let textInput = null, colorPicker = null;
        new Setting(containerEl).setName(name)
            .addColorPicker(color => {
                colorPicker = color;
                color.setValue(this.parseColor(this.plugin.settings[key])).onChange(async v => {
                    this.plugin.settings[key] = v; await this.plugin.saveSettings();
                    if (textInput) textInput.setValue(v);
                });
            })
            .addText(text => {
                textInput = text;
                text.setPlaceholder(this.plugin.t("colorDefault")).setValue(this.plugin.settings[key]).onChange(async v => {
                    this.plugin.settings[key] = v; await this.plugin.saveSettings();
                    if (colorPicker && v) { try { colorPicker.setValue(this.parseColor(v)); } catch (e) {} }
                });
            });
    }
    
    exportSettings() {
        const settingsJson = JSON.stringify(this.plugin.settings, null, 2);
        const blob = new Blob([settingsJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "folder-link-handler-settings.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        new Notice(this.plugin.t("exportSuccess"));
    }
    
    importSettings() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importedSettings = JSON.parse(text);
                
                if (typeof importedSettings !== "object" || importedSettings === null) {
                    throw new Error("Invalid settings format");
                }
                
                this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, importedSettings);
                await this.plugin.saveSettings();
                new Notice(this.plugin.t("importSuccess"));
                
                this.display();
                
                new Notice(this.plugin.t("restartRequired"));
            } catch (err) {
                new Notice(this.plugin.t("importError") + ": " + err.message);
            }
        };
        input.click();
    }
    
    injectSettingsStyles() {
        if (document.getElementById("folder-link-handler-settings-style")) return;
        const style = document.createElement("style");
        style.id = "folder-link-handler-settings-style";
        style.textContent = ".folder-link-rules-setting{display:block!important}.folder-link-rules-textarea{width:100%!important;min-height:220px!important;font-family:var(--font-monospace)!important;font-size:12px!important}";
        document.head.appendChild(style);
    }
    
    parseColor(colorStr) {
        if (!colorStr) return "#000000";
        if (colorStr.startsWith("var(")) {
            const tmp = document.createElement("div");
            tmp.style.color = colorStr;
            document.body.appendChild(tmp);
            const c = window.getComputedStyle(tmp).color;
            document.body.removeChild(tmp);
            const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (m) return "#" + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, "0")).join("");
        }
        if (colorStr.startsWith("#")) return colorStr;
        return "#000000";
    }
}