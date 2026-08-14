import noBrokerControlInHandler from './rules/no-broker-control-in-handler.mjs';
import noDirectBrokerPublish from './rules/no-direct-broker-publish.mjs';

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  meta: {
    name: 'eslint-plugin-crm',
    version: '0.0.0',
  },
  rules: {
    'no-broker-control-in-handler': noBrokerControlInHandler,
    'no-direct-broker-publish': noDirectBrokerPublish,
  },
};

export default plugin;
