import { MessageItem } from "./MessageItem";

export function ThreadMessage(props) {
  return <MessageItem {...props} idPrefix="thread-msg-" />;
}
