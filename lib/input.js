import { redact } from './context.js';
export function userInput(messages) {
    const eligible = messages.filter(message => message.source?.kind === 'user');
    return {
        userTurn: eligible.length > 0,
        text: redact(eligible.flatMap(message => message.content.filter(block => block.type === 'text').map(block => block.text ?? '')).join('\n')).slice(0, 8000),
    };
}
