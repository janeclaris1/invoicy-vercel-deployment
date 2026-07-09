import { Loader2 } from "lucide-react";


const Button = ({
    variant='primary',
    size='medium',
    isLoading=false,
    children,
    Icon: Icon,
    className = '',
    ...Props
}) => {

    const baseClasses = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow";
    
    const variantClasses = {
        primary:'bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white',
        secondary:'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 shadow-none hover:shadow-none',
        whiteOutline: 'bg-transparent hover:bg-white/10 text-white border border-white rounded-lg',
    };

    const sizeClasses = {
        small: 'px-3 py-1 h-8 text-sm',
        medium: 'px-4 py-2 h-10 text-sm',
        larger: 'px-6 py-3 h-12 text-base',
    };

 return (
    <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
        disabled={isLoading}
        {...Props}
    >
        {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
            <>
           { Icon && <Icon className="w-4 h-4 mr-2" />}
           {children}
              </>
        )}
    </button>
 );
};
export default Button;