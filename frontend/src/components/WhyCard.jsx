import Icon from './Icon';

export default function WhyCard({ mark, name, text }) {
  return (
    <div className="why-card">
      <span className="why-mark">
        <Icon tag={mark} size={15} />
        {mark}
      </span>
      <div className="why-body">
        <b>{name}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}
