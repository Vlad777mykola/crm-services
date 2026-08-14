import crmPlugin from '../eslint-plugin-crm/index.mjs';

const BROKER_IMPORT_MESSAGE =
  'Business code must not access RabbitMQ directly. Use the outbox or consumer infrastructure boundary.';

const KAFKA_IMPORT_MESSAGE =
  'Domain code must not import Kafka clients. Emit outbox events; delivery sinks own transport.';

/**
 * ESLint flat-config blocks that enforce messaging architecture layers.
 *
 * @param {{ scope?: 'service' | 'root' }} [options]
 * @returns {import('eslint').Linter.Config[]}
 */
export function createArchitectureConfig({ scope = 'service' } = {}) {
  const domainFiles =
    scope === 'root'
      ? [
          'services/*/src/handlers/**/*.ts',
          'services/*/src/modules/**/*.ts',
          'services/*/src/http/**/*.ts',
          'services/*/src/consumer/**/*.ts',
          'services/*/src/routes/**/*.ts',
        ]
      : [
          'src/handlers/**/*.ts',
          'src/modules/**/*.ts',
          'src/http/**/*.ts',
          'src/consumer/**/*.ts',
          'src/routes/**/*.ts',
        ];

  return [
    {
      files: domainFiles,
      plugins: {
        crm: crmPlugin,
      },
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'amqplib', message: BROKER_IMPORT_MESSAGE },
              { name: 'kafkajs', message: KAFKA_IMPORT_MESSAGE },
            ],
            patterns: [
              {
                group: ['@kafkajs/*', '@confluentinc/*'],
                message: KAFKA_IMPORT_MESSAGE,
              },
            ],
          },
        ],
        'crm/no-broker-control-in-handler': 'error',
        'crm/no-direct-broker-publish': 'error',
      },
    },
  ];
}
