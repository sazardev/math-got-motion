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
  },
};
