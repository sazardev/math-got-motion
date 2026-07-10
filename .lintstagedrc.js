export default {
  "*.ts,*.tsx": ["eslint --fix", "prettier --write"],
  "*.js,*.jsx": ["eslint --fix", "prettier --write"],
  "*.json,*.yaml,*.yml": ["prettier --write"],
  "*.css,*.scss": ["prettier --write"],
  "*.html": ["prettier --write"],
  "*.md": ["prettier --write"],
  "*.rs": ["rustfmt --"],
};
