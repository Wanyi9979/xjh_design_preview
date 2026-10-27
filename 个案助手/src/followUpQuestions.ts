import { demoKnowledge, draftTaskPrompts, productHelp, type ChatMessage, type TaskType } from './assistantData.ts';

export type FollowUpQuestion = { label: string; prompt: string; task: TaskType };

export function getFollowUpQuestions(item: ChatMessage, previousQuestion = ''): FollowUpQuestion[] {
  if (item.role !== 'ai' || !item.content.trim()) return [];
  const question = (label: string, task: TaskType, prompt = label): FollowUpQuestion => ({ label, prompt, task });
  const workflow = demoKnowledge.map(source => question(source.title, 'knowledge'));
  const help = productHelp.map(guide => question(guide.question, 'product'));
  const explain = question('这段内容怎么向患者解释？', 'explain', `${draftTaskPrompts.explain}${item.content}`);
  const communication = question('沟通前应该准备哪些信息？', 'knowledge', demoKnowledge[2].title);
  const byTask: Record<TaskType, FollowUpQuestion[]> = {
    knowledge: workflow,
    product: help,
    call: [workflow[1], communication, explain],
    admission: [workflow[0], workflow[1], help[2]],
    summary: [explain, workflow[1], communication],
    explain: [
      question('怎样确认患者理解了这些内容？', 'communication', `${draftTaskPrompts.communication}解释以下内容后，如何确认患者理解，并邀请患者提问？\n${item.content}`),
      communication,
      workflow[1],
    ],
    communication: [
      question('患者仍有顾虑，应该怎么开口？', 'communication', `${draftTaskPrompts.communication}患者听完以下说明后仍有顾虑，我该如何进一步倾听和回应？\n${item.content}`),
      communication,
      explain,
    ],
  };
  const recommendations = item.recommendations?.length
    ? item.recommendations.map(label => question(label, item.task === 'product' ? 'product' : 'knowledge'))
    : item.task ? byTask[item.task] : [help[0], workflow[0], help[1]];
  const seen = new Set<string>();
  return recommendations.filter(candidate => {
    if (candidate.prompt.trim() === previousQuestion.trim() || seen.has(candidate.label)) return false;
    seen.add(candidate.label);
    return true;
  }).slice(0, 3);
}
