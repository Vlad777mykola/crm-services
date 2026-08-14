/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-service-imports',
      severity: 'error',
      comment:
        'Microservices must not import each other\'s implementation. Use contracts/events and RabbitMQ instead.',
      from: {
        path: '^services/([^/]+)/',
      },
      to: {
        path: '^services/(?!\\1)[^/]+/src/',
      },
    },
    {
      name: 'no-domain-to-rabbitmq-adapter',
      severity: 'error',
      comment: 'Domain modules and handlers must not depend on rabbitmq/ adapters.',
      from: {
        path: '^services/([^/]+)/src/(modules|handlers)/',
      },
      to: {
        path: '^services/\\1/src/rabbitmq/',
      },
    },
    {
      name: 'no-domain-amqplib',
      severity: 'error',
      comment: 'Only rabbitmq/ infrastructure and outbox-publisher may depend on amqplib.',
      from: {
        path: '^services/[^/]+/src/(modules|handlers|http|consumer)/',
      },
      to: {
        dependencyTypes: ['npm'],
        path: '^amqplib$',
      },
    },
    {
      name: 'no-kafka-in-domain',
      severity: 'error',
      comment: 'Kafka clients belong in event-delivery sinks only (RFC2).',
      from: {
        path: '^services/[^/]+/src/(modules|handlers|http|consumer)/',
      },
      to: {
        path: '^(kafkajs|@kafkajs/|@confluentinc/)',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules|dist|coverage',
    },
    exclude: {
      path: 'node_modules|dist|coverage|\\.test\\.ts$|\\.spec\\.ts$',
    },
    tsPreCompilationDeps: false,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
