import { Article1, Article2, Article3, Article4, Article5 } from "@/assets/images";
import { Article } from "@/components/article/types";

const articleContent = `
In our fast-paced world, it can be incredibly frustrating to face slow progress or resistance in our personal or professional lives. Whether you're working on a project, learning a new skill, or trying to achieve a personal goal, patience is key. Here are some strategies to help you cultivate patience during these challenging times:

- **Set Realistic Expectations:** Understand that progress takes time. Set achievable milestones that allow you to celebrate small victories along the way.

- **Practice Mindfulness:** Engage in mindfulness techniques such as meditation or deep breathing. This can help you stay grounded and focused on the present moment rather than getting overwhelmed by the bigger picture.

- **Reflect on Past Successes:** Remind yourself of times when you faced challenges and eventually succeeded. This can boost your confidence and reinforce the idea that persistence pays off.

- **Seek Support:** Surround yourself with supportive friends, family, or mentors who can encourage you during tough times. Sharing your struggles can lighten the load and provide new perspectives.

- **Embrace the Journey:** Shift your focus from the end goal to the learning process. Each step, no matter how small, contributes to your growth.

- **Stay Flexible:** Be open to adjusting your plans. Sometimes, resistance can lead to new opportunities or paths you hadn't considered.

- **Limit Comparisons:** Avoid comparing your progress to others. Everyone's journey is unique, and focusing on your own path can help maintain your motivation.

By implementing these strategies, you can develop a more patient mindset and navigate through slow progress or resistance with resilience and grace.
`;

export const articles: Article[] = [
  {
    id: "1",
    title: "Managing Workplace Stress: Practical Tips for Better Mental Health",
    imageUrl: Article1,
    content: articleContent,
  },
  {
    id: "2",
    title: "Understanding Anxiety: Signs, Symptoms, and Coping Strategies",
    imageUrl: Article2,
    content: articleContent,
  },
  {
    id: "3",
    title: "The Power of Mindfulness in Daily Life",
    imageUrl: Article3,
    content: articleContent,
  },
  {
    id: "4",
    title: "Building Healthy Work-Life Boundaries",
    imageUrl: Article4,
    content: articleContent,
  },
  {
    id: "5",
    title: "Sleep Better: A Guide to Improving Your Sleep Quality",
    imageUrl: Article5,
    content: articleContent,
  },
  {
    id: "6",
    title: "Effective Communication Skills for Better Relationships",
    imageUrl: Article1,
    content: articleContent,
  },
];
