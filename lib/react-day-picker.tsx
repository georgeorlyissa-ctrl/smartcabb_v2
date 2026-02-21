/**
 * 📅 REACT DAY PICKER - STANDALONE LOCAL
 * 
 * Implémentation locale sans dépendance externe
 * Compatible avec SmartCabb
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import * as React from 'react';

export interface DayPickerProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | { from?: Date; to?: Date };
  onSelect?: (date: Date | Date[] | { from?: Date; to?: Date } | undefined) => void;
  disabled?: (date: Date) => boolean | Date | Date[];
  className?: string;
  classNames?: Record<string, string>;
  showOutsideDays?: boolean;
  defaultMonth?: Date;
  fromDate?: Date;
  toDate?: Date;
  numberOfMonths?: number;
  [key: string]: any;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isDateDisabled(date: Date, disabled?: (date: Date) => boolean | Date | Date[]): boolean {
  if (!disabled) return false;
  
  if (typeof disabled === 'function') {
    return disabled(date);
  }
  
  if (disabled instanceof Date) {
    return isSameDay(date, disabled);
  }
  
  if (Array.isArray(disabled)) {
    return disabled.some(d => isSameDay(date, d));
  }
  
  return false;
}

export function DayPicker({
  mode = 'single',
  selected,
  onSelect,
  disabled,
  className = '',
  classNames = {},
  showOutsideDays = true,
  defaultMonth,
  fromDate,
  toDate,
  numberOfMonths = 1,
  ...props
}: DayPickerProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    defaultMonth || (selected instanceof Date ? selected : new Date())
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (isDateDisabled(clickedDate, disabled)) {
      return;
    }
    
    if (fromDate && clickedDate < fromDate) {
      return;
    }
    
    if (toDate && clickedDate > toDate) {
      return;
    }
    
    if (mode === 'single') {
      onSelect?.(clickedDate);
    } else if (mode === 'multiple') {
      const selectedDates = Array.isArray(selected) ? selected : [];
      const index = selectedDates.findIndex(d => isSameDay(d, clickedDate));
      
      if (index >= 0) {
        onSelect?.(selectedDates.filter((_, i) => i !== index));
      } else {
        onSelect?.([...selectedDates, clickedDate]);
      }
    } else if (mode === 'range') {
      const range = selected as { from?: Date; to?: Date } | undefined;
      
      if (!range?.from || range.to) {
        onSelect?.({ from: clickedDate, to: undefined });
      } else if (clickedDate < range.from) {
        onSelect?.({ from: clickedDate, to: range.from });
      } else {
        onSelect?.({ from: range.from, to: clickedDate });
      }
    }
  };

  const isSelected = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (mode === 'single') {
      return selected instanceof Date && isSameDay(selected, date);
    } else if (mode === 'multiple') {
      return Array.isArray(selected) && selected.some(d => isSameDay(d, date));
    } else if (mode === 'range') {
      const range = selected as { from?: Date; to?: Date } | undefined;
      if (!range?.from) return false;
      if (!range.to) return isSameDay(range.from, date);
      return date >= range.from && date <= range.to;
    }
    
    return false;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: (number | null)[] = [];

    // Days from previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(showOutsideDays ? null : null);
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <div className="font-semibold text-sm">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            →
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="p-2" />;
            }

            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const disabled = isDateDisabled(date, disabled) ||
              (fromDate && date < fromDate) ||
              (toDate && date > toDate);
            const selected = isSelected(day);

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={disabled}
                className={`
                  p-2 text-sm rounded-lg transition-colors
                  ${selected ? 'bg-primary text-white font-semibold' : 'hover:bg-gray-100'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${classNames.day || ''}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`p-4 ${className}`} {...props}>
      {renderCalendar()}
    </div>
  );
}

export default DayPicker;
