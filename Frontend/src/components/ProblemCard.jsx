export function ProblemCard({ problem }) {
  if (!problem) return null;
  const body = (
    <>
      <span className="problem-id">{problem.platform} {problem.id}</span>
      <span className="problem-title">{problem.title}</span>
      <span className="problem-meta">
        {problem.difficulty ? <span>Difficulty: {problem.difficulty}</span> : null}
        {problem.topic ? <span>Topic: {problem.topic}</span> : null}
      </span>
    </>
  );
  if (!problem.url) return <div className="problem">{body}</div>;
  return (
    <a className="problem" href={problem.url} target="_blank" rel="noreferrer">
      {body}
    </a>
  );
}
