function lineNodes(text, keyRef) {
  const lines = text.split("\n");
  const nodes = [];
  lines.forEach((line, index) => {
    if (index > 0) nodes.push(<br key={`br-${keyRef.n++}`} />);
    if (line) nodes.push(<span key={`t-${keyRef.n++}`}>{line}</span>);
  });
  return nodes;
}

export function RichText({ text, users = [], mentionRoles = [] }) {
  if (!text) return null;
  const handles = new Map(users.map((user) => [user.handle.toLowerCase(), user]));
  const roles = new Map(mentionRoles.map((role) => [role.token, role]));
  const blocks = String(text).split("```");
  const keyRef = { n: 0 };

  return blocks.map((block, index) => {
    if (index % 2 === 1) {
      const newline = block.indexOf("\n");
      const code = (newline === -1 ? block : block.slice(newline + 1)).replace(/\n$/, "");
      return (
        <pre key={`code-${index}`} className="code">
          <code>{code}</code>
        </pre>
      );
    }
    const pattern = /(@[a-z0-9]+|https?:\/\/[^\s]+)/gi;
    const nodes = [];
    let last = 0;
    let match = pattern.exec(block);
    while (match) {
      if (match.index > last) nodes.push(...lineNodes(block.slice(last, match.index), keyRef));
      const token = match[0];
      if (token.startsWith("@")) {
        const key = token.slice(1).toLowerCase();
        const user = handles.get(key);
        const role = roles.get(key);
        if (user || role) {
          const label = user ? user.name.split(" ")[0] : role.label;
          nodes.push(
            <span key={`m-${keyRef.n++}`} className="mention">
              @{label}
            </span>
          );
        } else {
          nodes.push(<span key={`m-${keyRef.n++}`}>{token}</span>);
        }
      } else {
        nodes.push(
          <a key={`u-${keyRef.n++}`} href={token} target="_blank" rel="noreferrer">
            {token}
          </a>
        );
      }
      last = match.index + token.length;
      match = pattern.exec(block);
    }
    if (last < block.length) nodes.push(...lineNodes(block.slice(last), keyRef));
    return <span key={`p-${index}`}>{nodes}</span>;
  });
}
