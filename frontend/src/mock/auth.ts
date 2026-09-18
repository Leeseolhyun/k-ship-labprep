import type { LoginCredentials, User } from "../types/auth";

interface MockAccount extends User {
  password: string;
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: "u-01",
    name: "서지훈",
    email: "jihoon.seo@shipyard-ops.com",
    password: "demo1234",
    employeeId: "EMP-2019-0142",
    department: "설계혁신팀",
    position: "책임연구원",
    role: "관리자",
    phone: "010-1234-5678",
    joinedAt: "2019-03-04",
  },
  {
    id: "u-02",
    name: "김하늘",
    email: "haneul.kim@shipyard-ops.com",
    password: "demo1234",
    employeeId: "EMP-2022-0087",
    department: "생산관리팀",
    position: "주임",
    role: "일반사용자",
    phone: "010-9876-5432",
    joinedAt: "2022-07-18",
  },
];

export const DEMO_CREDENTIALS: LoginCredentials = {
  employeeId: MOCK_ACCOUNTS[0].employeeId,
  password: MOCK_ACCOUNTS[0].password,
};

export function fetchLogin(credentials: LoginCredentials): Promise<User> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      const account = MOCK_ACCOUNTS.find(
        (a) =>
          a.employeeId.toLowerCase() === credentials.employeeId.trim().toLowerCase() &&
          a.password === credentials.password
      );
      if (!account) {
        reject(new Error("사원번호 또는 비밀번호가 올바르지 않습니다."));
        return;
      }
      const { password: _password, ...user } = account;
      resolve(user);
    }, 700);
  });
}
