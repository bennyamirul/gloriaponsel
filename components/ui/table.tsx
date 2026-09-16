"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  showTopScrollbar?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, showTopScrollbar = true, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const [scrollWidth, setScrollWidth] = React.useState<number>(0);
    const [hasOverflow, setHasOverflow] = React.useState<boolean>(false);
    const isSyncingRef = React.useRef<boolean>(false);

    React.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const updateDimensions = () => {
        if (!container) return;
        const sw = container.scrollWidth;
        const cw = container.clientWidth;
        setScrollWidth(sw);
        setHasOverflow(sw > cw + 4);
      };

      updateDimensions();

      const observer = new ResizeObserver(() => {
        updateDimensions();
      });

      observer.observe(container);
      if (container.firstElementChild) {
        observer.observe(container.firstElementChild);
      }

      return () => {
        observer.disconnect();
      };
    }, []);

    const handleTopScroll = () => {
      if (isSyncingRef.current) return;
      if (containerRef.current && topScrollRef.current) {
        isSyncingRef.current = true;
        containerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      }
    };

    const handleBottomScroll = () => {
      if (isSyncingRef.current) return;
      if (containerRef.current && topScrollRef.current) {
        isSyncingRef.current = true;
        topScrollRef.current.scrollLeft = containerRef.current.scrollLeft;
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      }
    };

    return (
      <div className="relative w-full">
        {/* Top Synchronized Horizontal Scrollbar (hanya tampil jika tabel meluap/overflow horizontal) */}
        {showTopScrollbar && hasOverflow && (
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="w-full overflow-x-auto overflow-y-hidden border-b border-border/50 bg-muted/20 table-scrollbar-top select-none"
            style={{ height: "11px" }}
            aria-hidden="true"
          >
            <div
              style={{
                width: `${scrollWidth}px`,
                height: "1px",
              }}
            />
          </div>
        )}

        {/* Main Table Viewport with Bottom Scrollbar */}
        <div
          ref={containerRef}
          onScroll={handleBottomScroll}
          className="relative w-full overflow-auto"
        >
          <table
            ref={ref}
            className={cn("w-full caption-bottom text-sm", className)}
            {...props}
          />
        </div>
      </div>
    );
  }
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
