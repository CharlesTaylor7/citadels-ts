import { router, anonymousProcedure } from ".";

const POSTS = [
  { id: "1", title: "First post" },
  { id: "2", title: "Second post" },
  { id: "3", title: "Third post" },
  { id: "4", title: "Fourth post" },
  { id: "5", title: "Fifth post" },
  { id: "6", title: "Sixth post" },
  { id: "7", title: "Seventh post" },
  { id: "8", title: "Eighth post" },
  { id: "9", title: "Ninth post" },
  { id: "10", title: "Tenth post" },
];

export const dashboardRouter = router({
  posts: anonymousProcedure.query(async (_) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return POSTS;
  }),
  post: anonymousProcedure.input(String).query(async (req) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return POSTS.find((p) => p.id === req.input);
  }),
});
