/* eslint-disable react-refresh/only-export-components */
// Catalog V02 now shares the platform-wide QA context. This file re-exports the
// shared module so existing catalog imports keep working unchanged.
export {
  QAProvider,
  QAPanelProvider,
  useQAPanel,
  type APIEndpoint,
  type APIResponse,
  type BugSolution,
} from '../../../qa/QAContext';
