
const InputField = ({ icon: Icon, label, name, containerClassName = "", labelClassName = "", className = "", ...props }) => {
    return (
        <div className={containerClassName}>
            <label htmlFor={name} className={`block text-sm font-medium text-black dark:text-black mb-2 ${labelClassName}`}>{label}</label>
            <div className="relative">
                {Icon && <div className ="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="h-5 w-5 text-gray-400"/>
                </div>}
                <input id={name} name={name} {...props} className={`w-full h-10 pr-3 py-2 border border-gray-300 dark:border-gray-300 rounded-lg bg-white dark:bg-white text-black dark:text-black placeholder-gray-400  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${Icon ? 'pl-10' : 'pl-3'} ${className}`} />
            </div>
        </div>
    );
};

export default InputField;
