import type { Locale } from "./locale";

export interface UiStrings {
  scrollHint: string;
  themeToLight: string;
  themeToDark: string;
  menuTitle: string;
  closeMenu: string;
  searchPlaceholder: string;
  noResults: string;
  backToFormula: string;
  historyTitle: string;
  timelineTitle: string;
  useCasesTitle: string;
  exampleTitle: string;
  share: string;
  linkCopied: string;
  changelogNav: string;
  changelogTitle: string;
  changelogDescription: string;
  changelogAdded: string;
  changelogChanged: string;
  changelogFixed: string;
  changelogRemoved: string;
  notFoundTitle: string;
  notFoundDescription: string;
  notFoundBackLink: string;
  homeNav: string;
  homeTitle: string;
  homeTagline: string;
  homeDescription: string;
  homeStatsFormulas: string;
  homeStatsCategories: string;
  homeStatsLanguages: string;
  homeWhatTitle: string;
  homeWhatText: string;
  homeHowTitle: string;
  homeStep1Title: string;
  homeStep1Text: string;
  homeStep2Title: string;
  homeStep2Text: string;
  homeStep3Title: string;
  homeStep3Text: string;
  homeStep4Title: string;
  homeStep4Text: string;
  homeStep5Title: string;
  homeStep5Text: string;
  homeStackTitle: string;
  homeStackText: string;
  homeLanguagesTitle: string;
  homeContributeTitle: string;
  homeContributeText: string;
  homeContributeCta: string;
  homeEnterCta: string;
}

export const uiStrings: Record<Locale, UiStrings> = {
  es: {
    scrollHint: "Scroll para deconstruir la fórmula",
    themeToLight: "Claro",
    themeToDark: "Oscuro",
    menuTitle: "Fórmulas",
    closeMenu: "Cerrar",
    searchPlaceholder: "Buscar fórmula…",
    noResults: "Sin resultados",
    backToFormula: "Volver a la fórmula",
    historyTitle: "Historia",
    timelineTitle: "Línea de tiempo",
    useCasesTitle: "Dónde se usa hoy",
    exampleTitle: "Ejemplo resuelto",
    share: "Compartir",
    linkCopied: "Enlace copiado",
    changelogNav: "Novedades",
    changelogTitle: "Novedades",
    changelogDescription: "Qué cambió en Math Got Motion, versión por versión.",
    changelogAdded: "Agregado",
    changelogChanged: "Cambiado",
    changelogFixed: "Arreglado",
    changelogRemoved: "Quitado",
    notFoundTitle: "404",
    notFoundDescription: "No encontramos esta página.",
    notFoundBackLink: "Volver al inicio",
    homeNav: "Inicio",
    homeTitle: "Math Got Motion",
    homeTagline: "Teoremas y fórmulas, deconstruidos letra por letra a través del scroll.",
    homeDescription:
      "Qué es Math Got Motion, cómo funciona y cómo contribuir con una nueva fórmula.",
    homeStatsFormulas: "Fórmulas",
    homeStatsCategories: "Categorías",
    homeStatsLanguages: "Idiomas",
    homeWhatTitle: "Qué es",
    homeWhatText:
      "Una app multiplataforma (web, escritorio y móvil vía Tauri) que explica teoremas y leyes matemáticas con una experiencia radicalmente monocromática y tipográfica: el scroll separa cada símbolo de la fórmula, uno a la vez, y revela su significado.",
    homeHowTitle: "Cómo funciona",
    homeStep1Title: "Hero",
    homeStep1Text: "La fórmula ocupa toda la pantalla, intacta, en su tamaño más grande.",
    homeStep2Title: "Despegue",
    homeStep2Text: "Al primer scroll, los símbolos se separan con un rebote elástico.",
    homeStep3Title: "Aislamiento",
    homeStep3Text: "Cada símbolo pasa al centro, uno a la vez — los demás se atenúan.",
    homeStep4Title: "Resolución",
    homeStep4Text: "Una explicación aparece palabra por palabra junto al símbolo aislado.",
    homeStep5Title: "Epílogo",
    homeStep5Text:
      "La fórmula se encoge a un sello permanente y revela su historia, línea de tiempo, casos de uso reales y un ejemplo resuelto.",
    homeStackTitle: "Stack",
    homeStackText: "Tauri v2, React + TypeScript, GSAP (ScrollTrigger) y Vite — código abierto.",
    homeLanguagesTitle: "Idiomas",
    homeContributeTitle: "Cómo contribuir",
    homeContributeText:
      "Cada fórmula es un archivo de datos (YAML), no código — cualquiera puede agregar una nueva de forma simple y segura, incluso en una pull request externa.",
    homeContributeCta: "Ver en GitHub",
    homeEnterCta: "Explorar fórmulas",
  },
  en: {
    scrollHint: "Scroll to deconstruct the formula",
    themeToLight: "Light",
    themeToDark: "Dark",
    menuTitle: "Formulas",
    closeMenu: "Close",
    searchPlaceholder: "Search formulas…",
    noResults: "No results",
    backToFormula: "Back to the formula",
    historyTitle: "History",
    timelineTitle: "Timeline",
    useCasesTitle: "Where it's used today",
    exampleTitle: "Worked example",
    share: "Share",
    linkCopied: "Link copied",
    changelogNav: "Changelog",
    changelogTitle: "Changelog",
    changelogDescription: "What changed in Math Got Motion, version by version.",
    changelogAdded: "Added",
    changelogChanged: "Changed",
    changelogFixed: "Fixed",
    changelogRemoved: "Removed",
    notFoundTitle: "404",
    notFoundDescription: "We couldn't find this page.",
    notFoundBackLink: "Back to home",
    homeNav: "Home",
    homeTitle: "Math Got Motion",
    homeTagline: "Theorems and formulas, deconstructed letter by letter through scroll.",
    homeDescription: "What Math Got Motion is, how it works, and how to contribute a formula.",
    homeStatsFormulas: "Formulas",
    homeStatsCategories: "Categories",
    homeStatsLanguages: "Languages",
    homeWhatTitle: "What it is",
    homeWhatText:
      "A multiplatform app (web, desktop, and mobile via Tauri) that explains mathematical theorems and laws through a radically monochrome, typographic experience: scroll separates each symbol of the formula, one at a time, and reveals its meaning.",
    homeHowTitle: "How it works",
    homeStep1Title: "Hero",
    homeStep1Text: "The formula fills the whole screen, intact, at its largest size.",
    homeStep2Title: "Takeoff",
    homeStep2Text: "On the first scroll, the symbols separate with an elastic bounce.",
    homeStep3Title: "Isolation",
    homeStep3Text: "Each symbol moves to the center, one at a time — the rest dim.",
    homeStep4Title: "Resolution",
    homeStep4Text: "An explanation appears word by word next to the isolated symbol.",
    homeStep5Title: "Epilogue",
    homeStep5Text:
      "The formula shrinks into a permanent header and reveals its history, timeline, real-world use cases, and a worked example.",
    homeStackTitle: "Stack",
    homeStackText: "Tauri v2, React + TypeScript, GSAP (ScrollTrigger), and Vite — open source.",
    homeLanguagesTitle: "Languages",
    homeContributeTitle: "How to contribute",
    homeContributeText:
      "Every formula is a data file (YAML), not code — anyone can safely add a new one, even in an external pull request.",
    homeContributeCta: "View on GitHub",
    homeEnterCta: "Explore formulas",
  },
  pt: {
    scrollHint: "Role para desconstruir a fórmula",
    themeToLight: "Claro",
    themeToDark: "Escuro",
    menuTitle: "Fórmulas",
    closeMenu: "Fechar",
    searchPlaceholder: "Buscar fórmula…",
    noResults: "Nenhum resultado",
    backToFormula: "Voltar à fórmula",
    historyTitle: "História",
    timelineTitle: "Linha do tempo",
    useCasesTitle: "Onde é usada hoje",
    exampleTitle: "Exemplo resolvido",
    share: "Compartilhar",
    linkCopied: "Link copiado",
    changelogNav: "Novidades",
    changelogTitle: "Novidades",
    changelogDescription: "O que mudou no Math Got Motion, versão por versão.",
    changelogAdded: "Adicionado",
    changelogChanged: "Alterado",
    changelogFixed: "Corrigido",
    changelogRemoved: "Removido",
    notFoundTitle: "404",
    notFoundDescription: "Não encontramos esta página.",
    notFoundBackLink: "Voltar ao início",
    homeNav: "Início",
    homeTitle: "Math Got Motion",
    homeTagline: "Teoremas e fórmulas, desconstruídos letra por letra através do scroll.",
    homeDescription:
      "O que é o Math Got Motion, como funciona e como contribuir com uma nova fórmula.",
    homeStatsFormulas: "Fórmulas",
    homeStatsCategories: "Categorias",
    homeStatsLanguages: "Idiomas",
    homeWhatTitle: "O que é",
    homeWhatText:
      "Um app multiplataforma (web, desktop e mobile via Tauri) que explica teoremas e leis matemáticas com uma experiência radicalmente monocromática e tipográfica: o scroll separa cada símbolo da fórmula, um de cada vez, e revela seu significado.",
    homeHowTitle: "Como funciona",
    homeStep1Title: "Hero",
    homeStep1Text: "A fórmula ocupa a tela inteira, intacta, em seu maior tamanho.",
    homeStep2Title: "Decolagem",
    homeStep2Text: "No primeiro scroll, os símbolos se separam com um efeito elástico.",
    homeStep3Title: "Isolamento",
    homeStep3Text: "Cada símbolo vai ao centro, um de cada vez — os demais se atenuam.",
    homeStep4Title: "Resolução",
    homeStep4Text: "Uma explicação aparece palavra por palavra junto ao símbolo isolado.",
    homeStep5Title: "Epílogo",
    homeStep5Text:
      "A fórmula encolhe até um selo permanente e revela sua história, linha do tempo, casos de uso reais e um exemplo resolvido.",
    homeStackTitle: "Stack",
    homeStackText: "Tauri v2, React + TypeScript, GSAP (ScrollTrigger) e Vite — código aberto.",
    homeLanguagesTitle: "Idiomas",
    homeContributeTitle: "Como contribuir",
    homeContributeText:
      "Cada fórmula é um arquivo de dados (YAML), não código — qualquer pessoa pode adicionar uma nova de forma simples e segura, até em um pull request externo.",
    homeContributeCta: "Ver no GitHub",
    homeEnterCta: "Explorar fórmulas",
  },
  fr: {
    scrollHint: "Faites défiler pour déconstruire la formule",
    themeToLight: "Clair",
    themeToDark: "Sombre",
    menuTitle: "Formules",
    closeMenu: "Fermer",
    searchPlaceholder: "Rechercher une formule…",
    noResults: "Aucun résultat",
    backToFormula: "Retour à la formule",
    historyTitle: "Histoire",
    timelineTitle: "Chronologie",
    useCasesTitle: "Où elle est utilisée aujourd'hui",
    exampleTitle: "Exemple résolu",
    share: "Partager",
    linkCopied: "Lien copié",
    changelogNav: "Nouveautés",
    changelogTitle: "Nouveautés",
    changelogDescription: "Ce qui a changé dans Math Got Motion, version par version.",
    changelogAdded: "Ajouté",
    changelogChanged: "Modifié",
    changelogFixed: "Corrigé",
    changelogRemoved: "Supprimé",
    notFoundTitle: "404",
    notFoundDescription: "Nous n'avons pas trouvé cette page.",
    notFoundBackLink: "Retour à l'accueil",
    homeNav: "Accueil",
    homeTitle: "Math Got Motion",
    homeTagline: "Théorèmes et formules, déconstruits lettre par lettre au fil du défilement.",
    homeDescription:
      "Ce qu'est Math Got Motion, comment ça marche, et comment contribuer une nouvelle formule.",
    homeStatsFormulas: "Formules",
    homeStatsCategories: "Catégories",
    homeStatsLanguages: "Langues",
    homeWhatTitle: "Qu'est-ce que c'est",
    homeWhatText:
      "Une application multiplateforme (web, bureau et mobile via Tauri) qui explique des théorèmes et lois mathématiques à travers une expérience radicalement monochrome et typographique : le défilement sépare chaque symbole de la formule, un à la fois, et révèle son sens.",
    homeHowTitle: "Comment ça marche",
    homeStep1Title: "Hero",
    homeStep1Text: "La formule occupe tout l'écran, intacte, dans sa plus grande taille.",
    homeStep2Title: "Décollage",
    homeStep2Text: "Au premier défilement, les symboles se séparent avec un rebond élastique.",
    homeStep3Title: "Isolation",
    homeStep3Text: "Chaque symbole passe au centre, un à la fois — les autres s'atténuent.",
    homeStep4Title: "Résolution",
    homeStep4Text: "Une explication apparaît mot par mot à côté du symbole isolé.",
    homeStep5Title: "Épilogue",
    homeStep5Text:
      "La formule se réduit en un sceau permanent et révèle son histoire, sa chronologie, des cas d'usage réels et un exemple résolu.",
    homeStackTitle: "Stack",
    homeStackText: "Tauri v2, React + TypeScript, GSAP (ScrollTrigger) et Vite — open source.",
    homeLanguagesTitle: "Langues",
    homeContributeTitle: "Comment contribuer",
    homeContributeText:
      "Chaque formule est un fichier de données (YAML), pas du code — n'importe qui peut en ajouter une nouvelle en toute simplicité et sécurité, même via une pull request externe.",
    homeContributeCta: "Voir sur GitHub",
    homeEnterCta: "Explorer les formules",
  },
  zh: {
    scrollHint: "滚动以逐步拆解公式",
    themeToLight: "浅色",
    themeToDark: "深色",
    menuTitle: "公式",
    closeMenu: "关闭",
    searchPlaceholder: "搜索公式…",
    noResults: "没有结果",
    backToFormula: "返回公式",
    historyTitle: "历史",
    timelineTitle: "时间线",
    useCasesTitle: "如今的应用场景",
    exampleTitle: "示例解析",
    share: "分享",
    linkCopied: "链接已复制",
    changelogNav: "更新日志",
    changelogTitle: "更新日志",
    changelogDescription: "Math Got Motion 每个版本的变更记录。",
    changelogAdded: "新增",
    changelogChanged: "变更",
    changelogFixed: "修复",
    changelogRemoved: "移除",
    notFoundTitle: "404",
    notFoundDescription: "找不到这个页面。",
    notFoundBackLink: "返回首页",
    homeNav: "首页",
    homeTitle: "Math Got Motion",
    homeTagline: "通过滚动，逐字逐符号拆解定理与公式。",
    homeDescription: "了解 Math Got Motion 是什么、如何运作，以及如何贡献新公式。",
    homeStatsFormulas: "公式",
    homeStatsCategories: "分类",
    homeStatsLanguages: "语言",
    homeWhatTitle: "这是什么",
    homeWhatText:
      "一款跨平台应用（网页、桌面端，以及通过 Tauri 实现的移动端），以彻底的黑白单色排版风格讲解数学定理与定律：滚动会依次拆分公式中的每个符号，并揭示其含义。",
    homeHowTitle: "工作原理",
    homeStep1Title: "首屏",
    homeStep1Text: "公式以最大尺寸完整占据整个屏幕。",
    homeStep2Title: "起飞",
    homeStep2Text: "首次滚动时，各个符号以弹性效果分开。",
    homeStep3Title: "聚焦",
    homeStep3Text: "每个符号依次移到中心——其余符号则变暗。",
    homeStep4Title: "解析",
    homeStep4Text: "一段解释文字会在被聚焦的符号旁逐词浮现。",
    homeStep5Title: "尾声",
    homeStep5Text: "公式缩小为一个固定标记，并展示其历史、时间线、真实应用场景和解题示例。",
    homeStackTitle: "技术栈",
    homeStackText: "Tauri v2、React + TypeScript、GSAP（ScrollTrigger）与 Vite——开源项目。",
    homeLanguagesTitle: "语言",
    homeContributeTitle: "如何贡献",
    homeContributeText:
      "每个公式都是一个数据文件（YAML），而非代码——任何人都可以安全、简单地添加新公式，即便是通过外部 pull request。",
    homeContributeCta: "在 GitHub 上查看",
    homeEnterCta: "浏览公式",
  },
  ja: {
    scrollHint: "スクロールして数式を分解する",
    themeToLight: "ライト",
    themeToDark: "ダーク",
    menuTitle: "数式",
    closeMenu: "閉じる",
    searchPlaceholder: "数式を検索…",
    noResults: "該当なし",
    backToFormula: "数式に戻る",
    historyTitle: "歴史",
    timelineTitle: "年表",
    useCasesTitle: "現在の活用例",
    exampleTitle: "計算例",
    share: "共有",
    linkCopied: "リンクをコピーしました",
    changelogNav: "更新履歴",
    changelogTitle: "更新履歴",
    changelogDescription: "Math Got Motion のバージョンごとの変更点。",
    changelogAdded: "追加",
    changelogChanged: "変更",
    changelogFixed: "修正",
    changelogRemoved: "削除",
    notFoundTitle: "404",
    notFoundDescription: "ページが見つかりませんでした。",
    notFoundBackLink: "ホームに戻る",
    homeNav: "ホーム",
    homeTitle: "Math Got Motion",
    homeTagline: "定理と数式を、スクロールで一文字ずつ分解する。",
    homeDescription: "Math Got Motionとは何か、仕組み、新しい数式を貢献する方法について。",
    homeStatsFormulas: "数式",
    homeStatsCategories: "カテゴリー",
    homeStatsLanguages: "言語",
    homeWhatTitle: "概要",
    homeWhatText:
      "数学の定理や法則を、徹底したモノクロ・タイポグラフィ体験で解説するマルチプラットフォームアプリ（Web、デスクトップ、Tauri経由のモバイル）。スクロールすることで数式の各記号が一つずつ分離し、その意味が明らかになる。",
    homeHowTitle: "仕組み",
    homeStep1Title: "ヒーロー",
    homeStep1Text: "数式は最大サイズのまま、画面全体を占める。",
    homeStep2Title: "離陸",
    homeStep2Text: "最初のスクロールで、記号が弾むように分離する。",
    homeStep3Title: "分離",
    homeStep3Text: "各記号が一つずつ中央に移動し、他は薄暗くなる。",
    homeStep4Title: "解説",
    homeStep4Text: "分離された記号の横に、解説文が単語ごとに現れる。",
    homeStep5Title: "エピローグ",
    homeStep5Text:
      "数式は小さな印として固定され、その歴史・年表・実際の活用例・計算例が明らかになる。",
    homeStackTitle: "技術スタック",
    homeStackText: "Tauri v2、React + TypeScript、GSAP（ScrollTrigger）、Vite——オープンソース。",
    homeLanguagesTitle: "言語",
    homeContributeTitle: "貢献方法",
    homeContributeText:
      "各数式はコードではなくデータファイル（YAML）——誰でも安全かつ簡単に、外部からのプルリクエストでも新しい数式を追加できる。",
    homeContributeCta: "GitHubで見る",
    homeEnterCta: "数式を見る",
  },
};
