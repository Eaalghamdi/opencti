import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from './lib/cn';

export type PaginationProps = {
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
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
        aria-label="Previous page"
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
        aria-label="Next page"
        disabled={nextDisabled}
        onClick={onNext}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
