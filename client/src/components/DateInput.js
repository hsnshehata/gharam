import React, { useRef, useCallback } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

/**
 * DateInput component that displays dates in DD/MM/YYYY format
 * while keeping the internal value in YYYY-MM-DD format for the database.
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

  // Smart format: auto-pad day/month when the digit makes it obvious
  const smartFormat = useCallback((digits) => {
    let result = '';
    let i = 0;

    if (i >= digits.length) return result;

    // === DAY (DD) ===
    const d1 = digits[i]; i++;
    if (d1 >= '4') {
      // Day can't be 4x (max 31), so this must be 04-09
      result = '0' + d1;
    } else {
      // 0,1,2,3 — valid start for days (01-09, 10-19, 20-29, 30-31)
      result = d1;
      if (i < digits.length) {
        result += digits[i]; i++;
      } else {
        return result; // incomplete day
      }
    }

    // Day is complete, add slash if there are more digits
    if (i >= digits.length) return result;
    result += '/';

    // === MONTH (MM) ===
    const m1 = digits[i]; i++;
    if (m1 >= '2') {
      // Month can't be 2x-9x (max 12), so this must be 02-09
      result += '0' + m1;
    } else {
      // 0 or 1 — valid start (01-09 or 10-12)
      result += m1;
      if (i < digits.length) {
        result += digits[i]; i++;
      } else {
        return result; // incomplete month
      }
    }

    // Month is complete, add slash if there are more digits
    if (i >= digits.length) return result;
    result += '/';

    // === YEAR (YYYY — max 4 digits) ===
    let yearCount = 0;
    while (i < digits.length && yearCount < 4) {
      result += digits[i]; i++;
      yearCount++;
    }

    return result;
  }, []);

  // Handle manual text input
  const handleTextChange = useCallback((e) => {
    let raw = e.target.value;
    // Only allow digits and slashes
    raw = raw.replace(/[^\d/]/g, '');
    const digits = raw.replace(/\//g, '');

    const formatted = smartFormat(digits);

    // If complete DD/MM/YYYY (10 chars), convert and fire onChange
    if (formatted.length === 10) {
      const isoValue = toISO(formatted);
      const testDate = new Date(isoValue);
      if (!isNaN(testDate)) {
        onChange({ target: { value: isoValue } });
        return;
      }
    }

    // For incomplete input, store as-is temporarily
    onChange({ target: { value: formatted.length > 0 ? `__partial__${formatted}` : '' } });
  }, [onChange, smartFormat]);

  // Handle native date picker change
  const handleDatePickerChange = useCallback((e) => {
    onChange({ target: { value: e.target.value } });
  }, [onChange]);

  // Determine display value
  const displayValue = value?.startsWith?.('__partial__')
    ? value.replace('__partial__', '')
    : toDisplay(value);

  // The actual ISO value for the hidden picker
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
        as="label"
        disabled={disabled || readOnly}
        style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
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
