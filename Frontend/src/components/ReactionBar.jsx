export function ReactionBar({ reactions = [], users = [], meId, onToggle }) {
  if (!reactions.length) return null;
  return (
    <div className="reactions">
      {reactions.map((reaction) => {
        const mine = reaction.userIds.includes(meId);
        const names = reaction.userIds.map((id) => {
          if (id === meId) return "You";
          return users.find((user) => user.id === id)?.name || "Someone";
        });
        return (
          <button
            key={reaction.emoji}
            type="button"
            className={mine ? "reaction mine" : "reaction"}
            aria-pressed={mine}
            title={names.join(", ")}
            onClick={() => onToggle(reaction.emoji)}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span>{reaction.userIds.length}</span>
            {mine ? <span className="sr">You reacted</span> : null}
          </button>
        );
      })}
    </div>
  );
}
