CREATE TABLE `alerts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`threatId` bigint NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL,
	`alertStatus` enum('new','acknowledged','resolved') NOT NULL DEFAULT 'new',
	`recipientUserId` int,
	`actionTaken` text,
	`actionTimestamp` datetime,
	`timestamp` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `detectionRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`threatType` varchar(50) NOT NULL,
	`pattern` text NOT NULL,
	`patternType` enum('regex','signature','yara','custom') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`source` varchar(100),
	`reference` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `detectionRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`packetId` bigint NOT NULL,
	`protocolType` varchar(20) NOT NULL,
	`duration` int,
	`sourceBytes` int,
	`destinationBytes` int,
	`sourcePackets` int,
	`destinationPackets` int,
	`sourcePortCount` int,
	`destinationPortCount` int,
	`payloadLength` int,
	`averagePayloadSize` decimal(10,2),
	`interPacketTime` decimal(10,2),
	`flagCounts` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `features_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`logLevel` enum('debug','info','warning','error','critical') NOT NULL,
	`message` text NOT NULL,
	`component` varchar(100),
	`action` varchar(100),
	`userId` int,
	`metadata` text,
	`timestamp` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mlModels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`modelType` enum('random_forest','neural_network','svm','isolation_forest','hybrid') NOT NULL,
	`accuracy` decimal(5,2),
	`precision` decimal(5,2),
	`recall` decimal(5,2),
	`f1Score` decimal(5,2),
	`modelStatus` enum('training','active','inactive','deprecated') NOT NULL DEFAULT 'inactive',
	`modelPath` varchar(500),
	`trainingDataset` varchar(100),
	`trainingDate` datetime,
	`version` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mlModels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoredDevices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ipAddress` varchar(45) NOT NULL,
	`macAddress` varchar(17),
	`networkInterface` varchar(50),
	`deviceStatus` enum('active','inactive','offline') NOT NULL DEFAULT 'active',
	`lastSeen` datetime,
	`packetsMonitored` bigint NOT NULL DEFAULT 0,
	`threatsDetected` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoredDevices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packets` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`timestamp` datetime NOT NULL,
	`sourceIp` varchar(45) NOT NULL,
	`destinationIp` varchar(45) NOT NULL,
	`sourcePort` int NOT NULL,
	`destinationPort` int NOT NULL,
	`protocol` varchar(10) NOT NULL,
	`payloadSize` int NOT NULL,
	`flags` varchar(50),
	`ttl` int,
	`payload` text,
	`rawData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `packets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`rules` text,
	`actions` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`priority` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`value` text,
	`settingType` enum('string','number','boolean','json') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`period` datetime NOT NULL,
	`totalPackets` int NOT NULL,
	`totalThreats` int NOT NULL,
	`totalAlerts` int NOT NULL,
	`sqlInjectionCount` int NOT NULL DEFAULT 0,
	`xssCount` int NOT NULL DEFAULT 0,
	`bruteForceCount` int NOT NULL DEFAULT 0,
	`dosCount` int NOT NULL DEFAULT 0,
	`ddosCount` int NOT NULL DEFAULT 0,
	`portScanCount` int NOT NULL DEFAULT 0,
	`anomalyCount` int NOT NULL DEFAULT 0,
	`lowSeverity` int NOT NULL DEFAULT 0,
	`mediumSeverity` int NOT NULL DEFAULT 0,
	`highSeverity` int NOT NULL DEFAULT 0,
	`criticalSeverity` int NOT NULL DEFAULT 0,
	`detectionRate` decimal(5,2),
	`falsePositiveRate` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threats` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`packetId` bigint NOT NULL,
	`threatType` enum('sql_injection','xss','brute_force','dos','ddos','port_scan','anomaly','malware','unauthorized_access','data_exfiltration') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`confidence` decimal(5,2) NOT NULL,
	`sourceIp` varchar(45) NOT NULL,
	`destinationIp` varchar(45) NOT NULL,
	`sourcePort` int,
	`destinationPort` int,
	`description` text,
	`payload` text,
	`detectionMethod` varchar(50) NOT NULL,
	`status` enum('new','investigating','confirmed','false_positive','resolved') NOT NULL DEFAULT 'new',
	`metadata` text,
	`timestamp` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `threats_id` PRIMARY KEY(`id`)
);
