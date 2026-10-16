'use strict';

const MD_VARIANT = { primary: 'filled', secondary: 'tonal', outline: 'outlined', danger: 'danger' };
const MD_SIZE = { sm: 'md-btn-sm', lg: 'md-btn-lg' };

/**
 * Ported from HOM/ui-template.js#Button. The legacy version could bake an
 * `onclick="someGlobal()"` string into the generated HTML; here onClick is an
 * ordinary function prop, which is the whole point of the migration.
 *
 * Both class families are emitted, as with Badge.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  id,
  disabled = false,
  type = 'button',
  onClick,
  style,
  title,
  ...rest
}) {
  const classes = [
    'btn',
    'btn-' + variant,
    'btn-' + size,
    'md-btn',
    'md-btn-' + (MD_VARIANT[variant] || 'filled'),
    MD_SIZE[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      id={id}
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      style={style}
      title={title}
      {...rest}
    >
      {children}
    </button>
  );
}

