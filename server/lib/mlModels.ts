/**
 * مكتبة نماذج الذكاء الاصطناعي والتعلم الآلي
 * تتضمن نماذج Random Forest و Neural Network للكشف عن الهجمات
 */

import { ExtractedFeatures } from "./packetCapture";

/**
 * واجهة نتائج التنبؤ
 */
export interface PredictionResult {
  isAttack: boolean;
  attackType: string;
  confidence: number;
  probability: number;
  features: Record<string, number>;
}

/**
 * واجهة بيانات التدريب
 */
export interface TrainingData {
  features: number[][];
  labels: number[];
  attackTypes: string[];
}

/**
 * فئة Random Forest Classifier (محاكاة)
 * في الواقع، يمكن استخدام TensorFlow.js أو مكتبة أخرى
 */
export class RandomForestClassifier {
  private trees: DecisionTree[] = [];
  private numTrees: number = 100;
  private maxDepth: number = 20;
  private minSamplesSplit: number = 2;
  private featureNames: string[] = [];
  private isTrained: boolean = false;

  constructor(
    numTrees: number = 100,
    maxDepth: number = 20,
    minSamplesSplit: number = 2
  ) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  /**
   * تدريب النموذج
   */
  train(features: number[][], labels: number[]): void {
    if (features.length === 0) {
      throw new Error("Training data is empty");
    }

    // تهيئة الأشجار
    this.trees = [];

    for (let i = 0; i < this.numTrees; i++) {
      // إنشاء عينة عشوائية (Bootstrap)
      const { bootstrapFeatures, bootstrapLabels } = this.createBootstrapSample(
        features,
        labels
      );

      // بناء شجرة القرار
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit);
      tree.train(bootstrapFeatures, bootstrapLabels);
      this.trees.push(tree);
    }

    this.isTrained = true;
  }

  /**
   * التنبؤ
   */
  predict(features: number[]): number {
    if (!this.isTrained) {
      throw new Error("Model is not trained");
    }

    const predictions = this.trees.map((tree) => tree.predict(features));

    // التصويت بالأغلبية
    const count = predictions.reduce(
      (acc, pred) => {
        acc[pred] = (acc[pred] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const result = Object.keys(count).reduce((a, b) =>
      count[parseInt(a)] > count[parseInt(b)] ? a : b
    );
    return parseInt(result);
  }

  /**
   * الحصول على احتمالية التنبؤ
   */
  predictProba(features: number[]): number[] {
    if (!this.isTrained) {
      throw new Error("Model is not trained");
    }

    const predictions = this.trees.map((tree) => tree.predict(features));

    const count = predictions.reduce(
      (acc, pred) => {
        acc[pred] = (acc[pred] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const proba = [0, 0];
    proba[0] = (count[0] || 0) / this.numTrees;
    proba[1] = (count[1] || 0) / this.numTrees;

    return proba;
  }

  /**
   * إنشاء عينة Bootstrap
   */
  private createBootstrapSample(
    features: number[][],
    labels: number[]
  ): { bootstrapFeatures: number[][]; bootstrapLabels: number[] } {
    const n = features.length;
    const bootstrapFeatures: number[][] = [];
    const bootstrapLabels: number[] = [];

    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      bootstrapFeatures.push([...features[idx]]);
      bootstrapLabels.push(labels[idx]);
    }

    return { bootstrapFeatures, bootstrapLabels };
  }

  /**
   * الحصول على أهمية الميزات
   */
  getFeatureImportance(): number[] {
    if (!this.isTrained) {
      throw new Error("Model is not trained");
    }

    const importance = this.trees[0].getFeatureImportance();
    return importance;
  }

  /**
   * حفظ النموذج
   */
  save(): string {
    return JSON.stringify({
      numTrees: this.numTrees,
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      isTrained: this.isTrained,
      trees: this.trees.map((tree) => tree.save()),
    });
  }

  /**
   * تحميل النموذج
   */
  load(data: string): void {
    const parsed = JSON.parse(data);
    this.numTrees = parsed.numTrees;
    this.maxDepth = parsed.maxDepth;
    this.minSamplesSplit = parsed.minSamplesSplit;
    this.isTrained = parsed.isTrained;
    this.trees = parsed.trees.map((treeData: any) => {
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit);
      tree.load(treeData);
      return tree;
    });
  }
}

/**
 * فئة شجرة القرار
 */
class DecisionTree {
  private root: TreeNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;

  constructor(maxDepth: number = 20, minSamplesSplit: number = 2) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  /**
   * تدريب الشجرة
   */
  train(features: number[][], labels: number[]): void {
    this.root = this.buildTree(features, labels, 0);
  }

  /**
   * بناء الشجرة بشكل تكراري
   */
  private buildTree(
    features: number[][],
    labels: number[],
    depth: number
  ): TreeNode {
    const n = features.length;
    const numFeatures = features[0].length;

    // حساب الفئة الأكثر شيوعاً
    const classCount = labels.reduce(
      (acc, label) => {
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const majorityClass = Object.keys(classCount).reduce((a, b) =>
      classCount[parseInt(a)] > classCount[parseInt(b)]
        ? a
        : b
    );

    // شروط التوقف
    if (
      depth >= this.maxDepth ||
      n < this.minSamplesSplit ||
      Object.keys(classCount).length === 1
    ) {
      return new TreeNode(parseInt(majorityClass));
    }

    // البحث عن أفضل انقسام
    let bestGain = 0;
    let bestFeature = 0;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
      const featureValues = features.map((f) => f[featureIdx]);
      const uniqueValues = Array.from(new Set(featureValues)).sort(
        (a, b) => a - b
      );

      for (const threshold of uniqueValues) {
        const leftIndices = features
          .map((f, i) => (f[featureIdx] <= threshold ? i : -1))
          .filter((i) => i !== -1);
        const rightIndices = features
          .map((f, i) => (f[featureIdx] > threshold ? i : -1))
          .filter((i) => i !== -1);

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const gain = this.calculateGain(labels, leftIndices, rightIndices);

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = featureIdx;
          bestThreshold = threshold;
          bestLeftIndices = leftIndices;
          bestRightIndices = rightIndices;
        }
      }
    }

    // إذا لم نجد انقسام جيد
    if (bestGain === 0) {
      return new TreeNode(parseInt(majorityClass));
    }

    // بناء الفروع
    const leftFeatures = bestLeftIndices.map((i) => features[i]);
    const leftLabels = bestLeftIndices.map((i) => labels[i]);
    const rightFeatures = bestRightIndices.map((i) => features[i]);
    const rightLabels = bestRightIndices.map((i) => labels[i]);

    const leftChild = this.buildTree(leftFeatures, leftLabels, depth + 1);
    const rightChild = this.buildTree(rightFeatures, rightLabels, depth + 1);

    return new TreeNode(parseInt(majorityClass), bestFeature, bestThreshold, leftChild, rightChild);
  }

  /**
   * حساب الكسب المعلوماتي (Information Gain)
   */
  private calculateGain(
    labels: number[],
    leftIndices: number[],
    rightIndices: number[]
  ): number {
    const n = labels.length;
    const leftLabels = leftIndices.map((i) => labels[i]);
    const rightLabels = rightIndices.map((i) => labels[i]);

    const parentEntropy = this.calculateEntropy(labels);
    const leftEntropy = this.calculateEntropy(leftLabels);
    const rightEntropy = this.calculateEntropy(rightLabels);

    const weightedChildEntropy =
      (leftLabels.length / n) * leftEntropy +
      (rightLabels.length / n) * rightEntropy;

    return parentEntropy - weightedChildEntropy;
  }

  /**
   * حساب الإنتروبيا
   */
  private calculateEntropy(labels: number[]): number {
    const classCount = labels.reduce(
      (acc, label) => {
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    let entropy = 0;
    const n = labels.length;

    Object.values(classCount).forEach((count) => {
      const p = count / n;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    });

    return entropy;
  }

  /**
   * التنبؤ
   */
  predict(features: number[]): number {
    if (!this.root) {
      throw new Error("Tree is not trained");
    }
    return this.root.predict(features);
  }

  /**
   * الحصول على أهمية الميزات
   */
  getFeatureImportance(): number[] {
    if (!this.root) {
      throw new Error("Tree is not trained");
    }
    const importance: Record<number, number> = {};
    this.root.getFeatureImportance(importance);
    return Object.values(importance);
  }

  /**
   * حفظ الشجرة
   */
  save(): any {
    return {
      root: this.root?.save(),
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
    };
  }

  /**
   * تحميل الشجرة
   */
  load(data: any): void {
    this.maxDepth = data.maxDepth;
    this.minSamplesSplit = data.minSamplesSplit;
    this.root = TreeNode.load(data.root);
  }
}

/**
 * فئة عقدة الشجرة
 */
class TreeNode {
  private value: number; // قيمة الفئة إذا كانت ورقة
  private featureIndex?: number; // فهرس الميزة للانقسام
  private threshold?: number; // عتبة الانقسام
  private left?: TreeNode; // الفرع الأيسر
  private right?: TreeNode; // الفرع الأيمن

  constructor(
    value: number,
    featureIndex?: number,
    threshold?: number,
    left?: TreeNode,
    right?: TreeNode
  ) {
    this.value = value;
    this.featureIndex = featureIndex;
    this.threshold = threshold;
    this.left = left;
    this.right = right;
  }

  /**
   * التنبؤ
   */
  predict(features: number[]): number {
    if (this.featureIndex === undefined) {
      return this.value;
    }

    if (features[this.featureIndex] <= (this.threshold || 0)) {
      return this.left?.predict(features) || this.value;
    } else {
      return this.right?.predict(features) || this.value;
    }
  }

  /**
   * الحصول على أهمية الميزات
   */
  getFeatureImportance(importance: Record<number, number>): void {
    if (this.featureIndex !== undefined) {
      importance[this.featureIndex] = (importance[this.featureIndex] || 0) + 1;
      this.left?.getFeatureImportance(importance);
      this.right?.getFeatureImportance(importance);
    }
  }

  /**
   * حفظ العقدة
   */
  save(): any {
    return {
      value: this.value,
      featureIndex: this.featureIndex,
      threshold: this.threshold,
      left: this.left?.save(),
      right: this.right?.save(),
    };
  }

  /**
   * تحميل العقدة
   */
  static load(data: any): TreeNode {
    const node = new TreeNode(
      data.value,
      data.featureIndex,
      data.threshold,
      data.left ? TreeNode.load(data.left) : undefined,
      data.right ? TreeNode.load(data.right) : undefined
    );
    return node;
  }
}

/**
 * فئة Neural Network (محاكاة بسيطة)
 */
export class NeuralNetworkClassifier {
  private weights: any[] = [];
  private biases: any[] = [];
  private learningRate: number = 0.01;
  private epochs: number = 100;
  private isTrained: boolean = false;
  private inputSize: number = 0;
  private hiddenSize: number = 64;
  private outputSize: number = 2;

  constructor(
    inputSize: number = 20,
    hiddenSize: number = 64,
    outputSize: number = 2,
    learningRate: number = 0.01
  ) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;
    this.learningRate = learningRate;
    this.initializeWeights();
  }

  /**
   * تهيئة الأوزان
   */
  private initializeWeights(): void {
    // طبقة الإدخال إلى الطبقة المخفية
    this.weights[0] = Array(this.inputSize * this.hiddenSize)
      .fill(0)
      .map(() => Math.random() * 0.1 - 0.05) as any;

    // طبقة المخفية إلى طبقة الإخراج
    this.weights[1] = Array(this.hiddenSize * this.outputSize)
      .fill(0)
      .map(() => Math.random() * 0.1 - 0.05) as any;

    // الانحيازات
    this.biases[0] = Array(this.hiddenSize).fill(0) as any;
    this.biases[1] = Array(this.outputSize).fill(0) as any;
  }

  /**
   * تدريب النموذج
   */
  train(features: number[][], labels: number[]): void {
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      let totalLoss = 0;

      for (let i = 0; i < features.length; i++) {
        const input = features[i] as number[];
        const label = labels[i] as number;

        // Forward pass
        const hidden = this.relu(
          this.matmul(input, this.weights[0], this.biases[0])
        );
        const output = this.softmax(
          this.matmul(hidden, this.weights[1], this.biases[1])
        );

        // حساب الخسارة
        const loss = -Math.log(output[label] + 1e-10);
        totalLoss += loss;
      }

      if (epoch % 10 === 0) {
        console.log(`Epoch ${epoch}, Loss: ${totalLoss / features.length}`);
      }
    }

    this.isTrained = true;
  }

  /**
   * التنبؤ
   */
  predict(features: number[]): number {
    if (!this.isTrained) {
      throw new Error("Model is not trained");
    }

    const proba = this.predictProba(features);
    return proba[0] > proba[1] ? 0 : 1;
  }

  /**
   * الحصول على احتمالية التنبؤ
   */
  predictProba(features: number[]): number[] {
    const hidden = this.relu(
      this.matmul(features, this.weights[0], this.biases[0])
    );
    const output = this.softmax(
      this.matmul(hidden, this.weights[1], this.biases[1])
    );
    return output;
  }

  /**
   * الضرب النقطي
   */
  private matmul(
    input: number[],
    weights: number[],
    biases: number[]
  ): number[] {
    const outputSize = biases.length;
    const inputSize = input.length;
    const output: number[] = Array(outputSize).fill(0);

    for (let i = 0; i < outputSize; i++) {
      let sum = biases[i] as number;
      for (let j = 0; j < inputSize; j++) {
        sum += (input[j] as number) * (weights[i * inputSize + j] as number);
      }
      output[i] = sum;
    }

    return output;
  }

  /**
   * دالة التفعيل ReLU
   */
  private relu(x: number[]): number[] {
    return x.map((val) => Math.max(0, val));
  }

  /**
   * دالة Softmax
   */
  private softmax(x: number[]): number[] {
    const max = Math.max(...x);
    const exp = x.map((val) => Math.exp(val - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map((val) => val / sum);
  }

  /**
   * حفظ النموذج
   */
  save(): string {
    return JSON.stringify({
      weights: this.weights,
      biases: this.biases,
      learningRate: this.learningRate,
      epochs: this.epochs,
      isTrained: this.isTrained,
      inputSize: this.inputSize,
      hiddenSize: this.hiddenSize,
      outputSize: this.outputSize,
    });
  }

  /**
   * تحميل النموذج
   */
  load(data: string): void {
    const parsed = JSON.parse(data);
    this.weights = parsed.weights;
    this.biases = parsed.biases;
    this.learningRate = parsed.learningRate;
    this.epochs = parsed.epochs;
    this.isTrained = parsed.isTrained;
    this.inputSize = parsed.inputSize;
    this.hiddenSize = parsed.hiddenSize;
    this.outputSize = parsed.outputSize;
  }
}

/**
 * مدير النماذج
 */
export class ModelManager {
  private randomForest: RandomForestClassifier;
  private neuralNetwork: NeuralNetworkClassifier;
  private models: Map<string, any> = new Map();

  constructor() {
    this.randomForest = new RandomForestClassifier(100, 20, 2);
    this.neuralNetwork = new NeuralNetworkClassifier(20, 64, 2, 0.01);
  }

  /**
   * تدريب جميع النماذج
   */
  trainAll(features: number[][], labels: number[]): void {
    console.log("Training Random Forest...");
    this.randomForest.train(features, labels);

    console.log("Training Neural Network...");
    this.neuralNetwork.train(features, labels);
  }

  /**
   * التنبؤ باستخدام Random Forest
   */
  predictRandomForest(features: number[]): PredictionResult {
    const prediction = this.randomForest.predict(features);
    const proba = this.randomForest.predictProba(features);

    return {
      isAttack: prediction === 1,
      attackType: prediction === 1 ? "malicious" : "benign",
      confidence: Math.max(...proba) * 100,
      probability: (proba[1] as number) || 0,
      features: this.featuresToObject(features),
    };
  }

  /**
   * التنبؤ باستخدام Neural Network
   */
  predictNeuralNetwork(features: number[]): PredictionResult {
    const prediction = this.neuralNetwork.predict(features);
    const proba = this.neuralNetwork.predictProba(features);

    return {
      isAttack: prediction === 1,
      attackType: prediction === 1 ? "malicious" : "benign",
      confidence: Math.max(...proba) * 100,
      probability: proba[1],
      features: this.featuresToObject(features),
    };
  }

  /**
   * التنبؤ باستخدام كلا النموذجين (Ensemble)
   */
  predictEnsemble(features: number[]): PredictionResult {
    const rfResult = this.predictRandomForest(features);
    const nnResult = this.predictNeuralNetwork(features);

    // متوسط الثقة
    const avgConfidence = (rfResult.confidence + nnResult.confidence) / 2;
    const avgProbability = (rfResult.probability + nnResult.probability) / 2;

    return {
      isAttack: avgProbability > 0.5,
      attackType: avgProbability > 0.5 ? "malicious" : "benign",
      confidence: avgConfidence,
      probability: avgProbability,
      features: rfResult.features,
    };
  }

  /**
   * تحويل الميزات إلى كائن
   */
  private featuresToObject(features: number[]): Record<string, number> {
    const featureNames = [
      "protocolType",
      "duration",
      "sourceBytes",
      "destinationBytes",
      "sourcePackets",
      "destinationPackets",
      "sourcePortCount",
      "destinationPortCount",
      "payloadLength",
      "averagePayloadSize",
      "interPacketTime",
      "flagCounts",
      "feature12",
      "feature13",
      "feature14",
      "feature15",
      "feature16",
      "feature17",
      "feature18",
      "feature19",
    ];

    const obj: Record<string, number> = {};
    features.forEach((val, idx) => {
      obj[featureNames[idx] || `feature${idx}`] = val;
    });

    return obj;
  }

  /**
   * حفظ النماذج
   */
  saveModels(): string {
    return JSON.stringify({
      randomForest: this.randomForest.save(),
      neuralNetwork: this.neuralNetwork.save(),
    });
  }

  /**
   * تحميل النماذج
   */
  loadModels(data: string): void {
    const parsed = JSON.parse(data);
    this.randomForest.load(parsed.randomForest);
    this.neuralNetwork.load(parsed.neuralNetwork);
  }
}
