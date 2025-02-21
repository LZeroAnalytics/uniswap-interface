import * as React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-xl border bg-card text-card-foreground shadow",
                    className
                )}
                {...props}
            />
        );
    }
);
Card.displayName = "Card";

export { Card };