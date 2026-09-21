export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RuleGroupDto = {
  id: string;
  name: string;
  isActive: boolean;
};

export type CreateGroupInput = {
  name: string;
};

export type UpdateGroupInput = {
  id: string;
  name?: string;
};

export type SetGroupActiveInput = {
  id: string;
  isActive: boolean;
};

export type AvailabilityRuleDto = {
  id: string;
  groupId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type CreateRuleInput = {
  groupId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type UpdateRuleInput = {
  id: string;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
};
