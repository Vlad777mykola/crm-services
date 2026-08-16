const BROKER_CONTROL_METHODS = new Set(['ack', 'nack', 'reject', 'cancel', 'close']);

// Method names alone are ambiguous - `appointmentsService.cancel()` is a
// legitimate business call, not a broker control call. Only flag calls on
// receivers that actually look like an amqplib Channel, using the same
// variable-naming convention every rabbitmq/consumer.ts in this repo uses.
const CHANNEL_RECEIVER_NAMES = new Set(['channel', 'ch']);

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
        if (node.object.type !== 'Identifier' || !CHANNEL_RECEIVER_NAMES.has(node.object.name)) return;

        context.report({
          node,
          messageId: 'brokerControl',
          data: { method: node.property.name },
        });
      },
    };
  },
};
