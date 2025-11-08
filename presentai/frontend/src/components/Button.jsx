import { cn } from '../lib/utils';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  className,
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-background disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-brand-accent-soft via-brand-accent to-brand-accent-strong text-brand-text shadow-lg shadow-brand-accent/20 hover:from-brand-accent via-brand-accent-strong hover:to-brand-accent-soft hover:shadow-xl hover:scale-105 focus:ring-brand-accent',
    secondary: 'bg-brand-surface-alt text-brand-text hover:bg-brand-surface-glow focus:ring-brand-accent',
    outline: 'border-2 border-brand-accent/40 bg-transparent text-brand-text hover:bg-brand-surface-alt/70 hover:border-brand-accent focus:ring-brand-accent',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
