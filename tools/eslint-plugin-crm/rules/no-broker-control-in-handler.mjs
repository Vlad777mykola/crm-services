const BROKER_CONTROL_METHODS = new Set(['ack', 'nack', 'reject', 'cancel', 'close']);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow RabbitMQ ACK/NACK/channel lifecycle in business layers. Only rabbitmq/consumer.ts may control the channel.',
    },
    messages: {
      brokerControl:
        'RabbitMQ {{method}}() is infrastructure-only. Handlers must return success or throw; the consumer adapter owns ACK/NACK.',
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.property.type !== 'Identifier') return;
        if (!BROKER_CONTROL_METHODS.has(node.property.name)) return;
        if (node.parent.type !== 'CallExpression' || node.parent.callee !== node) return;

        context.report({
          node,
          messageId: 'brokerControl',
          data: { method: node.property.name },
        });
      },
    };
  },
};
