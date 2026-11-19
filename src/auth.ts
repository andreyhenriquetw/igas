import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await getPrisma().user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (
        session.user &&
        token.sub &&
        (token.role === "OWNER" || token.role === "MANAGER")
      ) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
