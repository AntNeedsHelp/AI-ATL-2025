import { cn } from '../lib/utils';

export const Card = ({ children, className, variant = 'default', ...props }) => {
  const variants = {
    default: 'rounded-2xl border border-brand-border/60 bg-brand-surface p-6 shadow-lg shadow-black/40',
    gradient: 'rounded-2xl bg-gradient-to-br from-brand-surface via-brand-surface-alt to-brand-surface-glow p-6 shadow-xl border border-brand-border/40',
    glass: 'rounded-2xl glass p-6 shadow-xl border border-brand-accent/30',
  };

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className, ...props }) => {
  return (
    <h3 className={cn('text-2xl font-semibold', className)} {...props}>
      {children}
    </h3>
  );
};

export const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
};
