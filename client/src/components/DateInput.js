import React, { useRef, useCallback } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

/**
 * DateInput component that displays dates in DD/MM/YYYY format
 * while keeping the internal value in YYYY-MM-DD format for the database.
 * 
 * Props:
 * - value: string in YYYY-MM-DD format (e.g., "2026-04-11")
 * - onChange: function(e) where e.target.value is in YYYY-MM-DD format
 * - required, disabled, readOnly: standard input props
 * - All other props are passed to the visible text input
 */
const DateInput = ({ value, onChange, required, disabled, readOnly, ...rest }) => {
  const hiddenDateRef = useRef(null);

  // Convert YYYY-MM-DD → DD/MM/YYYY for display
  const toDisplay = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Convert DD/MM/YYYY → YYYY-MM-DD for state
  const toISO = (displayDate) => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Handle manual text input
  const handleTextChange = useCallback((e) => {
    let raw = e.target.value;
    // Only allow digits and slashes
    raw = raw.replace(/[^\d/]/g, '');

    // Auto-insert slashes
    const digits = raw.replace(/\//g, '');
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += digits[i];
    }

    // If complete DD/MM/YYYY, convert and fire onChange
    if (formatted.length === 10) {
      const isoValue = toISO(formatted);
      // Validate the date
      const testDate = new Date(isoValue);
      if (!isNaN(testDate)) {
        onChange({ target: { value: isoValue } });
        return;
      }
    }

    // For incomplete input, store as-is temporarily
    // We fire onChange with the partial ISO conversion so the parent sees something
    if (formatted.length < 10) {
      onChange({ target: { value: formatted.length > 0 ? `__partial__${formatted}` : '' } });
    }
  }, [onChange]);

  // Handle native date picker change
  const handleDatePickerChange = useCallback((e) => {
    onChange({ target: { value: e.target.value } });
  }, [onChange]);

  // Open native date picker
  const openPicker = useCallback(() => {
    if (hiddenDateRef.current) {
      hiddenDateRef.current.showPicker?.();
      hiddenDateRef.current.click();
    }
  }, []);

  // Determine display value
  const displayValue = value?.startsWith?.('__partial__')
    ? value.replace('__partial__', '')
    : toDisplay(value);

  // The actual ISO value for the hidden picker (strip partial prefix)
  const isoValue = value?.startsWith?.('__partial__') ? '' : (value || '');

  return (
    <InputGroup>
      <Form.Control
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        placeholder="DD/MM/YYYY"
        maxLength={10}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        pattern="\d{2}/\d{2}/\d{4}"
        dir="ltr"
        style={{ textAlign: 'center' }}
        {...rest}
      />
      <Button
        variant="outline-secondary"
        onClick={openPicker}
        disabled={disabled || readOnly}
        style={{ position: 'relative', overflow: 'hidden' }}
        tabIndex={-1}
      >
        📅
        <input
          ref={hiddenDateRef}
          type="date"
          value={isoValue}
          onChange={handleDatePickerChange}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer'
          }}
          tabIndex={-1}
        />
      </Button>
    </InputGroup>
  );
};

export default DateInput;
