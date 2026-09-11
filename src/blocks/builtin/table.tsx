import type { TableBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { inline } from '../inline';

function Table({ block, resolveAnchor }: BlockProps<TableBlock>) {
  return (
    <div id={block.id} className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {block.headers.map((header, index) => (
              <th key={index} className="table-header">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="table-cell">
                  {inline(cell, resolveAnchor)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const tableBlock = defineBlock<TableBlock>({
  type: 'table',
  component: Table,
  searchText: (block) => [...block.headers, ...block.rows.flat()].join(' '),
  schema: {
    required: ['type', 'headers', 'rows'],
    additionalProperties: false,
    properties: {
      type: { const: 'table' },
      id: { $ref: '#/definitions/anchor' },
      headers: { $ref: '#/definitions/stringList' },
      rows: {
        type: 'array',
        minItems: 1,
        items: { $ref: '#/definitions/stringList' },
      },
    },
  },
});
