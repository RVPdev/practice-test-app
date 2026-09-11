import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Topic } from '@/core/schema';
import { QuestionMetaFields } from './QuestionMetaFields';

const topics: Topic[] = [{ id: 'hardware', name: 'Hardware' }];

const noop = () => {};

describe('QuestionMetaFields', () => {
  it('selects a topic', async () => {
    const onChangeTopicId = jest.fn();
    await render(
      <QuestionMetaFields
        topics={topics}
        topicId={undefined}
        difficulty={undefined}
        explanation={undefined}
        onChangeTopicId={onChangeTopicId}
        onChangeDifficulty={noop}
        onChangeExplanation={noop}
      />,
    );
    await fireEvent.press(screen.getByTestId('topic-chip-hardware'));
    expect(onChangeTopicId).toHaveBeenCalledWith('hardware');
  });

  it('deselects an already-selected topic', async () => {
    const onChangeTopicId = jest.fn();
    await render(
      <QuestionMetaFields
        topics={topics}
        topicId="hardware"
        difficulty={undefined}
        explanation={undefined}
        onChangeTopicId={onChangeTopicId}
        onChangeDifficulty={noop}
        onChangeExplanation={noop}
      />,
    );
    await fireEvent.press(screen.getByTestId('topic-chip-hardware'));
    expect(onChangeTopicId).toHaveBeenCalledWith(undefined);
  });

  it('hides the topic section when there are no topics', async () => {
    await render(
      <QuestionMetaFields
        topics={[]}
        topicId={undefined}
        difficulty={undefined}
        explanation={undefined}
        onChangeTopicId={noop}
        onChangeDifficulty={noop}
        onChangeExplanation={noop}
      />,
    );
    expect(screen.queryByText('Topic')).toBeNull();
  });

  it('selects a difficulty', async () => {
    const onChangeDifficulty = jest.fn();
    await render(
      <QuestionMetaFields
        topics={[]}
        topicId={undefined}
        difficulty={undefined}
        explanation={undefined}
        onChangeTopicId={noop}
        onChangeDifficulty={onChangeDifficulty}
        onChangeExplanation={noop}
      />,
    );
    await fireEvent.press(screen.getByTestId('difficulty-medium'));
    expect(onChangeDifficulty).toHaveBeenCalledWith('medium');
  });

  it('deselects an already-selected difficulty', async () => {
    const onChangeDifficulty = jest.fn();
    await render(
      <QuestionMetaFields
        topics={[]}
        topicId={undefined}
        difficulty="medium"
        explanation={undefined}
        onChangeTopicId={noop}
        onChangeDifficulty={onChangeDifficulty}
        onChangeExplanation={noop}
      />,
    );
    await fireEvent.press(screen.getByTestId('difficulty-medium'));
    expect(onChangeDifficulty).toHaveBeenCalledWith(undefined);
  });

  it('reports an explanation edit', async () => {
    const onChangeExplanation = jest.fn();
    await render(
      <QuestionMetaFields
        topics={[]}
        topicId={undefined}
        difficulty={undefined}
        explanation={undefined}
        onChangeTopicId={noop}
        onChangeDifficulty={noop}
        onChangeExplanation={onChangeExplanation}
      />,
    );
    await fireEvent.changeText(screen.getByTestId('question-explanation'), 'Because reasons');
    expect(onChangeExplanation).toHaveBeenCalledWith('Because reasons');
  });

  it('reports undefined when the explanation is cleared', async () => {
    const onChangeExplanation = jest.fn();
    await render(
      <QuestionMetaFields
        topics={[]}
        topicId={undefined}
        difficulty={undefined}
        explanation="Because reasons"
        onChangeTopicId={noop}
        onChangeDifficulty={noop}
        onChangeExplanation={onChangeExplanation}
      />,
    );
    await fireEvent.changeText(screen.getByTestId('question-explanation'), '');
    expect(onChangeExplanation).toHaveBeenCalledWith(undefined);
  });
});
