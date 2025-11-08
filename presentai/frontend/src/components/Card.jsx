import { cn } from '../lib/utils';

export const Card = ({ children, className, variant = 'default', ...props }) => {
  const variants = {
    default: 'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm',
    gradient: 'rounded-2xl bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 p-6 shadow-lg border border-white/50',
    glass: 'rounded-2xl glass p-6 shadow-xl border-2 border-white/50',
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
