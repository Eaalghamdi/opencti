import { Link } from 'react-router';

import { DoNotDisturbOnOutlined, OpenInNew } from '@mui/icons-material';
import { Typography } from '@mui/material';
import { useFormatter } from '../../i18n';

type DataTableSearchEmptyStateProps = {
  rawSearchTerm: string | undefined;
};

const DataTableSearchEmptyState = ({ rawSearchTerm }: DataTableSearchEmptyStateProps) => {
  const { t_i18n } = useFormatter();

  return (
    <div
      // `ds/tokens.css`'s Tailwind utilities only compile for files under `src/components/ds/`
      // (its `@source "./"`), so this file-local layout is driven by inline style + the
      // library's own CSS custom properties, not a Tailwind class - same convention as
      // `DataTableHeader.tsx`.
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBlock: 48,
        paddingInline: 16,
        width: '100%',
      }}
    >
      <DoNotDisturbOnOutlined
        style={{ fontSize: 40, color: 'var(--text-default-disabled)', marginBlockEnd: 8 }}
      />
      <Typography variant="h6" style={{ color: 'var(--muted-foreground)', marginBlockEnd: 16 }}>
        {rawSearchTerm ? `${t_i18n('No results for')} "${rawSearchTerm}"` : t_i18n('No results')}
      </Typography>
      {rawSearchTerm
        && (
          <Typography variant="body1">
            {t_i18n('Learn more about search options in {link}', {
              values: {
                link: (
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    to="https://docs.opencti.io/latest/usage/search/#search-syntax"
                  >
                    {t_i18n('our documentation')}
                    <OpenInNew style={{ fontSize: 14, paddingInlineStart: '2px', verticalAlign: 'middle', paddingBlockEnd: '2px' }} />
                  </Link>
                ),
              },
            })}
          </Typography>
        )
      }
    </div>
  );
};

export default DataTableSearchEmptyState;
