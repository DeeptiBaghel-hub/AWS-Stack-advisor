import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="wrap">
      <div className="eyebrow">404</div>
      <h1>This route doesn't exist</h1>
      <p className="sub">
        Whatever you were looking for isn't here. Try the quiz, the catalog, or head back home.
      </p>
      <div className="btn-row">
        <Link to="/" className="btn btn-primary">back to home</Link>
        <Link to="/quiz" className="btn">take the quiz</Link>
      </div>
    </div>
  );
}
