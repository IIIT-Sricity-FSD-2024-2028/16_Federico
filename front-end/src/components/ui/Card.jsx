'use strict';

/** Ported from HOM/ui-template.js Card / CardHeader / CardContent / CardFooter. */

export function Card({ children, className = '', style }) {
  return (
    <div className={['card', 'md-card', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={['card-header', className].filter(Boolean).join(' ')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 className="card-title">{title}</h4>
          {description ? <p className="card-description">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}

export function CardContent({ children, className = '', style }) {
  return (
    <div className={['card-content', className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return <div className={['card-footer', className].filter(Boolean).join(' ')}>{children}</div>;
}

export default Card;

