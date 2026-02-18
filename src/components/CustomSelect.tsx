'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface CustomSelectProps {
    name: string;
    options: SelectOption[];
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

export default function CustomSelect({
    name,
    options,
    value: controlledValue,
    defaultValue = '',
    onChange,
    placeholder,
    required,
    className = '',
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const containerRef = useRef<HTMLDivElement>(null);

    // Support both controlled and uncontrolled modes
    const currentValue = controlledValue !== undefined ? controlledValue : internalValue;
    const selectedOption = options.find(o => o.value === currentValue);
    const displayText = selectedOption?.label || placeholder || 'Select...';

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSelect(val: string) {
        if (controlledValue === undefined) {
            setInternalValue(val);
        }
        onChange?.(val);
        setIsOpen(false);
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={currentValue} />
            {required && !currentValue && (
                <input
                    tabIndex={-1}
                    autoComplete="off"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    value={currentValue}
                    required
                    onChange={() => { }}
                />
            )}

            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="custom-select-trigger w-full"
            >
                <span className={selectedOption ? 'custom-select-value' : 'custom-select-placeholder'}>
                    {displayText}
                </span>
                <ChevronDown
                    size={16}
                    className={`custom-select-chevron ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="custom-select-dropdown">
                    {options.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => !option.disabled && handleSelect(option.value)}
                            className={`custom-select-option ${option.value === currentValue ? 'selected' : ''
                                } ${option.disabled ? 'disabled' : ''}`}
                            style={option.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                        >
                            <span>{option.label}</span>
                            {option.value === currentValue && (
                                <Check size={14} className="custom-select-check" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
