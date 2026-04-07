export interface IDefineNewNiceErrorDomainOptions<ERR_DOMAIN extends string = string> {
  domain: ERR_DOMAIN;
}

export interface INiceErrorDefinedProps<ERR_DOMAINS extends string[] = string[]> {
  domain: ERR_DOMAINS[number];
  allDomains: ERR_DOMAINS;
}
