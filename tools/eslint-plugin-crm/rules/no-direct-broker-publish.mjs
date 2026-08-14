const BROKER_PUBLISH_METHODS = new Set(['publish', 'sendToQueue']);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct RabbitMQ publish from business layers. Use recordOutboxEvent() or outbox-publisher infrastructure.',
    },
    messages: {
      directPublish:
        'Direct broker {{method}}() is forbidden here. Record an outbox event in the same DB transaction instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.property.type !== 'Identifier') return;
        if (!BROKER_PUBLISH_METHODS.has(node.property.name)) return;
        if (node.parent.type !== 'CallExpression' || node.parent.callee !== node) return;

        context.report({
          node,
          messageId: 'directPublish',
          data: { method: node.property.name },
        });
      },
      ImportDeclaration(node) {
        if (node.source.value !== 'amqplib') return;
        context.report({
          node,
          message:
            'Business code must not import amqplib. Use outbox/consumer infrastructure boundaries.',
        });
      },
    };
  },
};
