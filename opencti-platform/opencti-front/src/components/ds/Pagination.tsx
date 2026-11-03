import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from './lib/cn';

export type PaginationProps = {
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  /** Overrides the previous control's accessible name. Defaults to "Previous page". */
  previousLabel?: string;
  /** Overrides the next control's accessible name. Defaults to "Next page". */
  nextLabel?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Plain prev/next control bar. Children render between the two controls,
 * so callers can place a result-count label or a page-size selector there.
 */
export function Pagination({
  onPrevious,
  onNext,
  previousDisabled = false,
  nextDisabled = false,
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  className,
  children,
}: PaginationProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Button
        variant="secondary"
        appearance="ghost"
        size="sm"
        iconOnly
        aria-label={previousLabel}
        disabled={previousDisabled}
        onClick={onPrevious}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>
      {children}
      <Button
        variant="secondary"
        appearance="ghost"
        size="sm"
        iconOnly
        aria-label={nextLabel}
        disabled={nextDisabled}
        onClick={onNext}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
