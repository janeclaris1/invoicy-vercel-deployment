
const SelectField = ({ label, name, options, containerClassName = "", labelClassName = "", ...props }) => {
    return (
        <div className={containerClassName}>
            <label htmlFor={name} className={`block text-sm font-medium text-black mb-2 ${labelClassName}`}>{label}</label>
            <select id={name} name={name} {...props} className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {options.map((option) => (
                    <option key={option.value || option} value={option.value || option}>{option.label}</option>
                ))}
            </select>
        </div>

    )
};

export default SelectField;