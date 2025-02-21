import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
    "relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
    {
        variants: {
            variant: {
                default: "bg-background text-foreground",
                destructive:
                    "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant, ...props }, ref) => {
        return (
            <div
                ref={ref}
                role="alert"
                className={cn(alertVariants({ variant }), className)}
                {...props}
            />
        );
    }
);
Alert.displayName = "Alert";

type AlertDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("text-sm [&_p]:leading-relaxed", className)}
                {...props}
            />
        );
    }
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };