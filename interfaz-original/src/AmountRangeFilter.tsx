import { useEffect, useRef, useState } from 'react';
import { Slider, SliderTrack, SliderThumb } from 'react-aria-components';
import { useRemote } from './components';
import {
  amountRangeLimit,
  amountRangeValues,
  changeAmountRange,
  wholeAmountRange,
  type AmountRange,
} from './amount-range';

const priceFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Kit: paleta monocroma, controles comunes y área táctil independiente del tirador.
export function AmountRangeFilter({
  label,
  source,
  minimum = '',
  maximum = '',
  errors = {},
  onChange,
}: {
  label: string;
  source: string;
  minimum?: string;
  maximum?: string;
  errors?: { minTotal?: string; maxTotal?: string };
  onChange: (range: AmountRange) => void;
}) {
  const [retry, setRetry] = useState(0);
  const { data, loading, error } = useRemote<{ maximum: string }>(source, retry);
  const limit = amountRangeLimit(data?.maximum);
  const ready = !loading && !error;
  const rangeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!errors.minTotal && !errors.maxTotal) return;
    const frame = requestAnimationFrame(() => {
      const input =
        rangeRef.current?.querySelectorAll<HTMLInputElement>('input[type="range"]')[
          errors.minTotal ? 0 : 1
        ];
      input?.focus();
      input?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [errors.minTotal, errors.maxTotal]);
  const values = amountRangeValues(minimum, maximum, limit);
  const display = (value: string, fallback: number) => {
    const number = value.trim().replace(',', '.');
    return value.trim()
      ? Number.isFinite(Number(number))
        ? priceFormat.format(Number(number))
        : '—'
      : priceFormat.format(fallback);
  };
  const integerRange = wholeAmountRange({ minTotal: minimum, maxTotal: maximum });
  const rangeLabel = `${display(integerRange.minTotal, 0)} – ${display(integerRange.maxTotal, limit)}`;
  return (
    <div ref={rangeRef} className="amount-range-filter" role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <span className="amount-range-value">
        {ready ? rangeLabel : loading ? 'Cargando importes…' : '—'}
      </span>
      {error && (
        <div>
          <span role="alert">{error}</span>
          <button
            className="quiet-link"
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Reintentar importes
          </button>
        </div>
      )}
      <Slider
        className="amount-range-slider"
        aria-label={label}
        minValue={0}
        maxValue={limit}
        isDisabled={!ready || limit === 0}
        step={1}
        value={values}
        onChange={(next) =>
          onChange(changeAmountRange({ minTotal: minimum, maxTotal: maximum }, next, limit))
        }
        formatOptions={{
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }}
      >
        <SliderTrack className="amount-range-track">
          {({ state }) => (
            <>
              <div className="amount-range-rail" />
              <div
                className="amount-range-fill"
                style={{
                  left: `${limit ? state.getThumbPercent(0) * 100 : 0}%`,
                  width: `${limit ? (state.getThumbPercent(1) - state.getThumbPercent(0)) * 100 : 0}%`,
                }}
              />
              <SliderThumb
                index={0}
                className="amount-range-thumb"
                aria-label="Mínimo"
                style={limit ? undefined : { left: '0%' }}
              />
              <SliderThumb
                index={1}
                className="amount-range-thumb"
                aria-label="Máximo"
                style={limit ? undefined : { left: '0%' }}
              />
            </>
          )}
        </SliderTrack>
      </Slider>
      {(errors.minTotal || errors.maxTotal) && (
        <span className="field-error" role="alert">
          {errors.minTotal || errors.maxTotal}
        </span>
      )}
    </div>
  );
}
