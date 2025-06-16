import initConfig from '../init.json';

export interface VulnData {
  vul_name: string;
  problem_description: string;
  vul_modify_repair: string;
}

export interface AppConfig {
  hazardLevels: string[];
  hazardTypes: string[];
  unitTypes: string[];
  industries: string[];
  vuln_data: VulnData[];
}

// 在编译时加载配置
export const config: AppConfig = initConfig;

// 导出具体的配置项
export const { hazardLevels, hazardTypes, unitTypes, industries, vuln_data } = config; 